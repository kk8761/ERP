/**
 * API Documentation Routes
 *
 * Serves the interactive developer portal and OpenAPI specification.
 *
 * Routes (mounted at /api/docs):
 *   GET /api/docs              — Interactive Swagger UI portal
 *   GET /api/docs/openapi.yaml — Raw OpenAPI 3.0 YAML specification
 *   GET /api/docs/openapi.json — OpenAPI spec as JSON
 *
 * No authentication required — docs are intentionally public.
 *
 * Requirements: 28.7
 */

import { Router } from 'express';
import {
  serveDocsPortal,
  serveOpenApiSpec,
  serveOpenApiJson,
} from '../controllers/docs.controller';

const router = Router();

/**
 * GET /api/docs
 *
 * Interactive developer documentation portal powered by Swagger UI.
 * Renders an HTML page that loads the OpenAPI spec from /api/docs/openapi.yaml.
 */
router.get('/', serveDocsPortal);

/**
 * GET /api/docs/openapi.yaml
 *
 * Returns the raw OpenAPI 3.0 YAML specification file.
 * Suitable for import into Postman, Insomnia, or code-generation tools.
 */
router.get('/openapi.yaml', serveOpenApiSpec);

/**
 * GET /api/docs/openapi.json
 *
 * Returns the OpenAPI specification as JSON (parsed from YAML).
 * Useful for programmatic consumption or client SDK generation.
 */
router.get('/openapi.json', serveOpenApiJson);

export default router;
