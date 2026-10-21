"""
NexaERP SSRF (Server-Side Request Forgery) Defense Shield.
Prevents internal network port scanning, AWS/GCP/Azure cloud metadata extraction,
and loopback service manipulation by enforcing rigorous destination IP validation.
"""

import socket
import ipaddress
from urllib.parse import urlparse
from typing import Tuple

# Cloud metadata and internal service IP ranges
BLOCKED_HOSTNAMES = {
    "metadata.google.internal",
    "metadata",
    "instance-data",
    "169.254.169.254", # AWS / Azure / GCP metadata IP
    "169.254.170.2",   # AWS ECS metadata
    "100.100.100.200", # Alibaba Cloud metadata
    "localhost",
    "loopback"
}

def is_safe_external_url(url: str) -> Tuple[bool, str]:
    """
    Validates that a URL targets a strictly safe, public external internet host.
    Blocks:
    - Loopback IPs (127.0.0.0/8, ::1)
    - Private RFC 1918 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    - Link-local addresses (169.254.0.0/16)
    - Cloud instance metadata services
    - Non-HTTP(S) protocols (file://, gopher://, dict://, ftp://)
    """
    if not url:
        return False, "URL cannot be empty."

    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, f"Malformed URL syntax: {e}"

    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        return False, f"Prohibited URI protocol '{scheme}'. Only HTTP and HTTPS are permitted."

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return False, "Missing hostname in target URL."

    # 1. Blocked hostname keywords
    if hostname in BLOCKED_HOSTNAMES or hostname.endswith(".internal") or hostname.endswith(".local"):
        return False, f"Host '{hostname}' references a protected or internal cloud domain."

    # 2. DNS resolution and IP address range validation
    try:
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror:
        return False, f"Failed to resolve hostname '{hostname}'."

    for item in addr_info:
        ip_str = item[4][0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            return False, f"Resolved destination '{ip_str}' is not a valid IP."

        if ip_obj.is_loopback:
            return False, f"SSRF Attack Blocked: Destination resolves to loopback IP {ip_str}."
        if ip_obj.is_private:
            return False, f"SSRF Attack Blocked: Destination resolves to private network IP {ip_str}."
        if ip_obj.is_link_local:
            return False, f"SSRF Attack Blocked: Destination resolves to link-local/metadata IP {ip_str}."
        if ip_obj.is_reserved:
            return False, f"SSRF Attack Blocked: Destination resolves to reserved IP {ip_str}."
        if ip_obj.is_multicast:
            return False, f"SSRF Attack Blocked: Destination resolves to multicast IP {ip_str}."

    return True, "Safe external URL."


def sanitize_external_request_url(url: str) -> str:
    """
    Validates the destination URL using SSRF defense rules.
    Returns the validated URL or raises ValueError with a descriptive security reason.
    """
    is_safe, reason = is_safe_external_url(url)
    if not is_safe:
        raise ValueError(f"SSRF Shield Violation: {reason}")
    return url

