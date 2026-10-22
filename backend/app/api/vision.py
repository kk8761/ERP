import base64
import re
import io
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

try:
    import cv2
    import numpy as np
    from PIL import Image
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    np = None
    Image = None
    CV2_AVAILABLE = False

from app.database import get_db
from app.models.inventory import Product, ProductCategory
from app.models.auth import User
from app.api.auth import get_current_user
from app.services.inventory_service import adjust_product_stock
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/api/vision", tags=["Computer Vision & Machine Learning"])


class VisionExtractFeaturesRequest(BaseModel):
    image_base64: str


class VisionExtractFeaturesResponse(BaseModel):
    success: bool
    features: Optional[Dict[str, Any]] = None
    visual_attributes: Optional[Dict[str, Any]] = None
    features_json: Optional[str] = None


class VisionAnalyzeRequest(BaseModel):
    image_base64: str
    detection_mode: str = "auto"  # "auto" (QR first, then visual), "qr_only", "visual_only"
    target_category: Optional[str] = None


class VisionDeductRequest(BaseModel):
    product_id: int
    quantity: int = Field(1, ge=1)
    reason: str = "COMPUTER_VISION_CHECKOUT_DEDUCTION"
    notes: Optional[str] = None


class VisionDeductResponse(BaseModel):
    success: bool
    product_id: int
    product_name: str
    sku: str
    quantity_deducted: int
    previous_stock: int
    new_stock: int
    message: str


class VisionAnalyzeResponse(BaseModel):
    success: bool
    detection_type: str  # "QR_CODE", "VISUAL_OBJECT", "NONE"
    detected_label: str
    confidence: float
    raw_payload: Optional[str] = None
    bounding_box: Optional[List[int]] = None  # [x, y, width, height]
    visual_attributes: Optional[Dict[str, Any]] = None
    product: Optional[Dict[str, Any]] = None
    catalog_matched: bool
    suggested_products: List[Dict[str, Any]] = []
    speech_text: str
    guidance: str


def decode_base64_image(b64_str: str) -> Optional[Any]:
    """Decodes a base64 string (with or without data URI prefix) to an OpenCV BGR image."""
    if not CV2_AVAILABLE:
        return None
    try:
        # Strip header if present (e.g. data:image/jpeg;base64,...)
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_str)
        img_np = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Base64 decode error: {e}")
        return None


def detect_qr_code(img: Any) -> Optional[Dict[str, Any]]:
    """Detects and decodes QR codes using OpenCV's QRCodeDetector."""
    if not CV2_AVAILABLE or img is None:
        return None
    try:
        qr_detector = cv2.QRCodeDetector()
        data, points, _ = qr_detector.detectAndDecode(img)
        if data and points is not None and len(points) > 0:
            pts = points[0]
            # Convert points to bounding box [x, y, w, h]
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            min_x, max_x = int(min(xs)), int(max(xs))
            min_y, max_y = int(min(ys)), int(max(ys))
            return {
                "data": data.strip(),
                "bbox": [min_x, min_y, max(10, max_x - min_x), max(10, max_y - min_y)],
                "confidence": 0.99
            }
    except Exception as e:
        print(f"QR detection exception: {e}")
    return None


def classify_visual_item(img: Any) -> Dict[str, Any]:
    """
    Computer Vision & ML Feature Classifier for identifying retail items without QR/barcode.
    Analyzes contour geometry, circularity, aspect ratio, HSV color distribution, and edge density.
    """
    if not CV2_AVAILABLE or img is None:
        return {
            "label": "Unknown Item",
            "confidence": 0.0,
            "category": "General",
            "is_circular": False,
            "circularity": 0.0,
            "aspect_ratio": 1.0,
            "edge_density": 0.0,
            "predominant_color": "Unknown",
            "hsv_mean": [0, 0, 0],
            "bbox": [0, 0, 100, 100],
            "attributes": {"dominant_color": "Unknown"}
        }
    h, w = img.shape[:2]
    # Resize to standard analysis size if large
    if max(h, w) > 480:
        scale = 480.0 / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))
        h, w = img.shape[:2]

    # Convert to Grayscale & HSV
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Blur to suppress noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Edge detection & Otsu thresholding
    edges = cv2.Canny(blurred, 30, 100)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Combine edges and threshold for robust foreground segmentation
    combined = cv2.bitwise_or(edges, thresh)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    morph = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Find prominent contours
    contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter out boundary noise; focus on centered items
    valid_contours = []
    min_area = (h * w) * 0.03  # At least 3% of the screen
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > min_area:
            valid_contours.append((area, cnt))

    if valid_contours:
        # Pick largest foreground object
        valid_contours.sort(key=lambda x: x[0], reverse=True)
        best_area, best_cnt = valid_contours[0]
        bx, by, bw, bh = cv2.boundingRect(best_cnt)
        perimeter = cv2.arcLength(best_cnt, True)
        circularity = (4 * np.pi * best_area) / (perimeter ** 2 + 1e-5)
        aspect_ratio = float(bw) / float(bh)
        extent = float(best_area) / (bw * bh + 1e-5)

        # Region of Interest for color
        roi_hsv = hsv[by:by+bh, bx:bx+bw]
        roi_gray = gray[by:by+bh, bx:bx+bw]
    else:
        # Fallback to center frame crop
        bx, by, bw, bh = int(w * 0.2), int(h * 0.2), int(w * 0.6), int(h * 0.6)
        roi_hsv = hsv[by:by+bh, bx:bx+bw]
        roi_gray = gray[by:by+bh, bx:bx+bw]
        circularity = 0.5
        aspect_ratio = 1.0
        extent = 0.5

    # Color extraction in ROI
    mean_h = np.mean(roi_hsv[:, :, 0])
    mean_s = np.mean(roi_hsv[:, :, 1])
    mean_v = np.mean(roi_hsv[:, :, 2])

    # Determine dominant visual color category
    color_name = "Neutral"
    if mean_v < 55:
        color_name = "Black / Dark"
    elif mean_s < 45 and mean_v > 160:
        color_name = "White / Silver"
    elif mean_s < 40:
        color_name = "Grey / Neutral"
    elif (mean_h <= 10) or (mean_h >= 165):
        color_name = "Red"
    elif 11 <= mean_h <= 24:
        color_name = "Orange"
    elif 25 <= mean_h <= 36:
        color_name = "Yellow"
    elif 37 <= mean_h <= 85:
        color_name = "Green"
    elif 86 <= mean_h <= 130:
        color_name = "Blue"
    elif 131 <= mean_h <= 164:
        color_name = "Purple / Violet"

    # Texture complexity via Laplacian variance
    lap_var = cv2.Laplacian(roi_gray, cv2.CV_64F).var()

    # Rule-based computer vision classifier scoring
    scores = {}

    # 1. Fresh Apple (Red or Green, round/circular profile)
    if circularity > 0.65 and 0.8 <= aspect_ratio <= 1.25 and color_name in ["Red", "Green", "Yellow"]:
        scores["Fresh Apple"] = 0.88 + (0.08 if circularity > 0.78 else 0.0)
    elif circularity > 0.60 and color_name == "Red":
        scores["Fresh Apple"] = 0.78

    # 2. Fresh Banana (Elongated aspect ratio, Yellow or Green)
    if (aspect_ratio > 1.7 or aspect_ratio < 0.55) and color_name in ["Yellow", "Green", "Orange"]:
        scores["Fresh Banana"] = 0.89
    elif aspect_ratio > 1.5 and color_name in ["Yellow", "Green"]:
        scores["Fresh Banana"] = 0.75

    # 3. Fresh Orange / Citrus (High circularity, Orange hue)
    if circularity > 0.70 and 0.85 <= aspect_ratio <= 1.2 and color_name == "Orange":
        scores["Fresh Orange"] = 0.94
    elif color_name == "Orange" and circularity > 0.60:
        scores["Fresh Orange"] = 0.82

    # 4. Fresh Tomato (Round, vibrant Red, high saturation)
    if circularity > 0.68 and color_name == "Red" and mean_s > 90:
        scores["Fresh Tomato"] = 0.86

    # 5. Fresh Lemon (Yellow, oval/citrus aspect)
    if 0.65 <= aspect_ratio <= 1.45 and color_name == "Yellow" and circularity > 0.55:
        scores["Fresh Lemon"] = 0.84

    # 6. Beverage Bottle / Drink (Tall cylinder: height significantly exceeds width)
    if aspect_ratio < 0.62 and extent > 0.45:
        scores["Beverage Bottle (1L / 500ml)"] = 0.91
    elif aspect_ratio < 0.75:
        scores["Beverage Bottle (1L / 500ml)"] = 0.80

    # 7. Soda Can / Beverage Can (Moderate cylinder)
    if 0.50 <= aspect_ratio <= 0.75 and color_name in ["Red", "Blue", "White / Silver", "Black / Dark"]:
        scores["Beverage Can (330ml)"] = 0.85

    # 8. Smartphone / Mobile Device (Rectangular screen profile, sleek dark/metallic face)
    if (0.42 <= aspect_ratio <= 0.60 or 1.65 <= aspect_ratio <= 2.2) and color_name in ["Black / Dark", "White / Silver", "Grey / Neutral"]:
        scores["Smartphone / Mobile Device"] = 0.92
    elif (0.40 <= aspect_ratio <= 0.65) and lap_var < 500:
        scores["Smartphone / Mobile Device"] = 0.81

    # 9. Computer Mouse (Compact teardrop or smooth oval)
    if 1.15 <= aspect_ratio <= 1.75 and 0.60 <= circularity <= 0.85 and color_name in ["Black / Dark", "White / Silver", "Grey / Neutral", "Blue"]:
        scores["Computer Mouse (Optical / Wireless)"] = 0.89

    # 10. Packaged Box / Carton / Grocery Box (High extent, rectangular sharp edges)
    if extent > 0.68 and 0.65 <= aspect_ratio <= 1.6:
        scores["Packaged Grocery Box / Carton"] = 0.87

    # 11. Snack Bag / Packet (Flexible outline, high edge density / colorful)
    if lap_var > 450 and color_name in ["Red", "Yellow", "Blue", "Green", "Orange"]:
        scores["Snack Packet / Chips Bag"] = 0.83

    # 12. Book / Notebook (Rectangular planar bounds, high edge contrast)
    if (0.65 <= aspect_ratio <= 0.85 or 1.2 <= aspect_ratio <= 1.55) and extent > 0.60:
        scores["Book / Notebook (Stationery)"] = 0.82

    # 13. Apparel / T-Shirt / Fabric (Broad soft contour, medium-to-large area)
    if aspect_ratio >= 1.0 and lap_var < 350 and best_area > (h * w * 0.20):
        scores["T-Shirt / Apparel Garment"] = 0.80

    # 14. Coffee Mug / Cup (Cylindrical with protrusion)
    if 0.80 <= aspect_ratio <= 1.35 and color_name in ["White / Silver", "Black / Dark", "Red", "Blue"]:
        scores["Ceramic Mug / Coffee Cup"] = 0.79

    # If no high score, select generic item by geometry
    if not scores:
        if aspect_ratio < 0.7:
            scores["Packaged Cylindrical Product"] = 0.72
        elif circularity > 0.65:
            scores["Round Produce / Item"] = 0.70
        else:
            scores["Packaged Retail Merchandise"] = 0.74

    # Pick highest confidence label
    best_item = max(scores.items(), key=lambda x: x[1])

    return {
        "label": best_item[0],
        "confidence": round(float(best_item[1]), 2),
        "bbox": [bx, by, bw, bh],
        "attributes": {
            "dominant_color": color_name,
            "circularity": round(float(circularity), 2),
            "aspect_ratio": round(float(aspect_ratio), 2),
            "edge_texture": "High" if lap_var > 300 else "Smooth",
            "extent": round(float(extent), 2)
        }
    }



def extract_image_features(img: Any) -> Optional[Dict[str, Any]]:
    """
    Extracts deep visual features including foreground-segmented 2D normalized HSV color histogram,
    mean HSV color, aspect ratio, edge texture complexity, and circularity for computer vision matching.
    """
    if not CV2_AVAILABLE or img is None:
        return None
    try:
        h, w = img.shape[:2]
        if max(h, w) > 400:
            scale = 400.0 / max(h, w)
            img_scaled = cv2.resize(img, (int(w * scale), int(h * scale)))
        else:
            img_scaled = img

        hsv = cv2.cvtColor(img_scaled, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(img_scaled, cv2.COLOR_BGR2GRAY)

        # Detect foreground by excluding pure dark background or pure bright white studio background
        mask = cv2.inRange(gray, 18, 245)
        # If mask is too small or covers nothing, analyze the entire frame
        if cv2.countNonZero(mask) < (img_scaled.shape[0] * img_scaled.shape[1] * 0.05):
            mask = None

        # 16x16 2D Hue-Saturation color distribution
        hist = cv2.calcHist([hsv], [0, 1], mask, [16, 16], [0, 180, 0, 256])
        cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)
        flat_hist = hist.flatten().tolist()

        if mask is not None:
            mean_hsv = cv2.mean(hsv, mask=mask)[:3]
        else:
            mean_hsv = np.mean(hsv, axis=(0, 1))

        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        return {
            "hist": [round(float(val), 4) for val in flat_hist],
            "mean_hsv": [round(float(x), 2) for x in mean_hsv],
            "aspect_ratio": round(float(w) / float(h), 3),
            "lap_var": round(lap_var, 2)
        }
    except Exception as e:
        print(f"Feature extraction error: {e}")
        return None


def compute_feature_similarity(feat1: Dict[str, Any], feat2: Dict[str, Any]) -> float:
    """Computes similarity (0.0 to 1.0) between two visual feature maps using histogram correlation, Bhattacharyya distance, and HSV color."""
    if not feat1 or not feat2:
        return 0.0
    try:
        # Histogram correlation & Bhattacharyya
        hist1 = np.array(feat1.get("hist", []), dtype=np.float32).reshape((16, 16))
        hist2 = np.array(feat2.get("hist", []), dtype=np.float32).reshape((16, 16))
        
        hist_correl = float(cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL))
        correl_score = max(0.0, hist_correl)

        bhatta_dist = float(cv2.compareHist(hist1, hist2, cv2.HISTCMP_BHATTACHARYYA))
        bhatta_score = max(0.0, 1.0 - bhatta_dist)

        # Mean HSV color distance
        hsv1 = feat1.get("mean_hsv", [0, 0, 0])
        hsv2 = feat2.get("mean_hsv", [0, 0, 0])
        dh = min(abs(hsv1[0] - hsv2[0]), 180 - abs(hsv1[0] - hsv2[0])) / 90.0
        ds = abs(hsv1[1] - hsv2[1]) / 255.0
        dv = abs(hsv1[2] - hsv2[2]) / 255.0
        color_dist = (dh * 0.6) + (ds * 0.2) + (dv * 0.2)
        color_score = max(0.0, 1.0 - color_dist)

        # Aspect ratio compatibility
        ar1 = feat1.get("aspect_ratio", 1.0)
        ar2 = feat2.get("aspect_ratio", 1.0)
        ar_ratio = min(ar1, ar2) / (max(ar1, ar2) + 1e-5)

        total_sim = (correl_score * 0.40) + (bhatta_score * 0.35) + (color_score * 0.15) + (ar_ratio * 0.10)
        return max(0.0, min(1.0, total_sim))
    except Exception as e:
        print(f"Similarity computation error: {e}")
        return 0.0


@router.post("/extract-features", response_model=VisionExtractFeaturesResponse)
async def extract_features_endpoint(
    req: VisionExtractFeaturesRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Extracts computer vision feature map and color metadata from an uploaded product photo.
    This feature map is mapped to the product in the inventory catalog.
    """
    img = decode_base64_image(req.image_base64)
    if img is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not decode base64 image data"
        )
    features = extract_image_features(img)
    visual_attrs = classify_visual_item(img)

    return VisionExtractFeaturesResponse(
        success=features is not None,
        features=features,
        visual_attributes=visual_attrs.get("attributes"),
        features_json=json.dumps(features) if features else None
    )


@router.post("/deduct", response_model=VisionDeductResponse)
async def deduct_scanned_product_stock(
    req: VisionDeductRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deducts stock when an item is detected moving out of the store / cashier checkout.
    Automatically creates a stock movement record and audit log.
    """
    product = await db.get(Product, req.product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {req.product_id} not found"
        )

    if product.current_stock < req.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock for '{product.name}'. Current stock is {product.current_stock} {product.unit_of_measure}, cannot deduct {req.quantity}."
        )

    prev_stock = product.current_stock
    # Adjust stock downwards (-req.quantity)
    movement = await adjust_product_stock(
        db=db,
        product_id=product.id,
        quantity_change=-req.quantity,
        movement_type="SALE_OUT",
        user_id=current_user.id,
        notes=req.notes or f"Computer Vision exit deduction: {req.quantity} {product.unit_of_measure} checked out via camera vision",
        organization_id=getattr(current_user, "organization_id", None)
    )

    await record_audit_log(
        db, action="VISION_STOCK_DEDUCTED", entity_name="Product",
        entity_id=str(product.id), user_id=current_user.id,
        user_email=current_user.email, status="SUCCESS",
        details={
            "name": product.name,
            "sku": product.sku,
            "quantity_deducted": req.quantity,
            "previous_stock": prev_stock,
            "new_stock": movement.new_stock,
            "reason": req.reason
        }
    )
    await db.commit()

    return VisionDeductResponse(
        success=True,
        product_id=product.id,
        product_name=product.name,
        sku=product.sku,
        quantity_deducted=req.quantity,
        previous_stock=prev_stock,
        new_stock=movement.new_stock,
        message=f"Successfully deducted {req.quantity} {product.unit_of_measure} of '{product.name}'. New stock: {movement.new_stock}."
    )


@router.post("/analyze-frame", response_model=VisionAnalyzeResponse)
async def analyze_camera_frame(
    req: VisionAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Real-Time Computer Vision & ML Camera Analysis.
    1. Detects QR codes & barcodes.
    2. Performs visual feature matching against catalog products' mapped photos.
    3. Falls back to geometry and color heuristic recognition.
    """
    img = decode_base64_image(req.image_base64)
    if img is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 camera image payload"
        )

    qr_result = None
    if req.detection_mode in ["auto", "qr_only"]:
        qr_result = detect_qr_code(img)

    # 1. If QR code detected
    if qr_result and qr_result["data"]:
        code = qr_result["data"]
        # Search for product in DB by barcode, sku, or name
        stmt = select(Product).where(
            or_(
                Product.barcode == code,
                Product.sku == code,
                Product.name.ilike(f"%{code}%")
            )
        )
        res = await db.execute(stmt)
        matched_product = res.scalars().first()

        product_dict = None
        if matched_product:
            product_dict = {
                "id": matched_product.id,
                "name": matched_product.name,
                "sku": matched_product.sku,
                "barcode": matched_product.barcode,
                "selling_price": float(matched_product.selling_price),
                "cost_price": float(matched_product.cost_price),
                "current_stock": matched_product.current_stock,
                "unit_of_measure": matched_product.unit_of_measure,
                "image_url": matched_product.image_url,
                "status": matched_product.status if hasattr(matched_product, "status") else "In Stock"
            }
            speech = f"QR code scanned: {matched_product.name}. Price: ₹{float(matched_product.selling_price):.2f}. Available stock: {matched_product.current_stock} {matched_product.unit_of_measure}."
            guidance = f"Matched to inventory catalog SKU: {matched_product.sku}. Ready for POS checkout or stock deduction."
        else:
            speech = f"QR code detected with value: {code}. Not found in store catalog."
            guidance = f"Unregistered QR code [{code}]. You can register this product in Step 1."

        return VisionAnalyzeResponse(
            success=True,
            detection_type="QR_CODE",
            detected_label=product_dict["name"] if product_dict else f"QR: {code}",
            confidence=qr_result["confidence"],
            raw_payload=code,
            bounding_box=qr_result["bbox"],
            product=product_dict,
            catalog_matched=product_dict is not None,
            speech_text=speech,
            guidance=guidance
        )

    # 2. Extract visual features of current frame
    current_features = extract_image_features(img)
    visual_res = classify_visual_item(img)
    label = visual_res["label"]
    confidence = visual_res["confidence"]
    bbox = visual_res["bbox"]
    attrs = visual_res["attributes"]

    # Match against catalog products in DB
    prods_stmt = select(Product)
    prods_res = await db.execute(prods_stmt)
    all_prods = prods_res.scalars().all()

    matched_product = None
    best_match_score = 0.0
    suggested = []

    # A. Check for direct visual feature matches with mapped catalog photos
    if current_features:
        for p in all_prods:
            if p.vision_features:
                try:
                    stored_feat = json.loads(p.vision_features)
                    sim = compute_feature_similarity(current_features, stored_feat)
                    if sim > 0.65 and sim > best_match_score:
                        best_match_score = sim
                        matched_product = {
                            "id": p.id,
                            "name": p.name,
                            "sku": p.sku,
                            "barcode": p.barcode,
                            "selling_price": float(p.selling_price),
                            "cost_price": float(p.cost_price),
                            "current_stock": p.current_stock,
                            "unit_of_measure": p.unit_of_measure,
                            "image_url": p.image_url,
                            "status": "In Stock" if p.current_stock > p.reorder_level else "Low Stock"
                        }
                    elif sim > 0.50:
                        suggested.append({
                            "id": p.id,
                            "name": p.name,
                            "sku": p.sku,
                            "barcode": p.barcode,
                            "selling_price": float(p.selling_price),
                            "cost_price": float(p.cost_price),
                            "current_stock": p.current_stock,
                            "unit_of_measure": p.unit_of_measure,
                            "image_url": p.image_url,
                            "status": "In Stock" if p.current_stock > p.reorder_level else "Low Stock"
                        })
                except Exception as err:
                    print(f"Error parsing vision_features for product {p.id}: {err}")

    # B. If no direct visual feature map matched with high confidence, use classifier tokens & heuristics
    if not matched_product:
        clean_label_tokens = [w.lower() for w in re.findall(r'\w+', label) if len(w) > 2 and w.lower() not in ["fresh", "item", "packaged", "device", "produce"]]

        for p in all_prods:
            p_name_lower = p.name.lower()
            match_score = 0
            for token in clean_label_tokens:
                if token in p_name_lower:
                    match_score += 1
            if attrs.get("dominant_color", "").lower() in p_name_lower:
                match_score += 0.5

            if match_score > 0:
                p_dict = {
                    "id": p.id,
                    "name": p.name,
                    "sku": p.sku,
                    "barcode": p.barcode,
                    "selling_price": float(p.selling_price),
                    "cost_price": float(p.cost_price),
                    "current_stock": p.current_stock,
                    "unit_of_measure": p.unit_of_measure,
                    "image_url": p.image_url,
                    "status": "In Stock" if p.current_stock > p.reorder_level else "Low Stock"
                }
                if matched_product is None:
                    matched_product = p_dict
                elif p_dict not in suggested:
                    suggested.append(p_dict)

    if matched_product:
        conf_display = int(best_match_score * 100) if best_match_score > 0 else int(confidence * 100)
        match_source = "Mapped Photo Feature Recognition" if best_match_score > 0 else "Object Geometry & Color Classification"
        speech = f"Identified {matched_product['name']}. Available stock: {matched_product['current_stock']} {matched_product['unit_of_measure']}. Price: ₹{matched_product['selling_price']:.2f}."
        guidance = f"Matched to catalog product '{matched_product['name']}' via {match_source} ({conf_display}% confidence)."
    else:
        conf_display = int(confidence * 100)
        speech = f"Visually identified {label} with {conf_display} percent confidence. No matching item currently in store catalog."
        guidance = f"Detected: {label} (Color: {attrs.get('dominant_color', 'Unknown')}). You can register and map this item photo in Step 1."

    return VisionAnalyzeResponse(
        success=True,
        detection_type="VISUAL_OBJECT",
        detected_label=matched_product["name"] if matched_product else label,
        confidence=best_match_score if best_match_score > 0 else confidence,
        bounding_box=bbox,
        visual_attributes=attrs,
        product=matched_product,
        catalog_matched=matched_product is not None,
        suggested_products=suggested[:3],
        speech_text=speech,
        guidance=guidance
    )
