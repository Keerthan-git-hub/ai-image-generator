import base64
import logging
import os
from pathlib import Path

import httpx
from fastapi import UploadFile

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-nano-banana-2.1")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}
KNOWLEDGE_FILE = (
    Path(__file__).resolve().parent.parent
    / "knowledge"
    / "AI_Image_Generator_Agent_Instructions.md"
)
KNOWLEDGE_START = "<!-- IMAGE_PROMPT_RULES_START -->"
KNOWLEDGE_END = "<!-- IMAGE_PROMPT_RULES_END -->"


class GeminiAPIError(RuntimeError):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


def _load_image_guidance() -> str:
    try:
        knowledge = KNOWLEDGE_FILE.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(
            f"Unable to read image-generation guidance: {KNOWLEDGE_FILE}"
        ) from exc

    if knowledge.count(KNOWLEDGE_START) != 1 or knowledge.count(KNOWLEDGE_END) != 1:
        raise RuntimeError("Image-generation guidance markers are missing or duplicated.")

    guidance = (
        knowledge.split(KNOWLEDGE_START, 1)[1]
        .split(KNOWLEDGE_END, 1)[0]
        .strip()
    )
    if not guidance:
        raise RuntimeError("Image-generation guidance section is empty.")
    return guidance


def _extract_image(response_data: dict) -> tuple[str, str]:
    output_image = response_data.get("output_image")
    if isinstance(output_image, dict) and isinstance(output_image.get("data"), str):
        return output_image["data"], output_image.get("mime_type", "image/png")

    for step in response_data.get("steps", []):
        if not isinstance(step, dict):
            continue
        content = step.get("content", [])
        if not isinstance(content, list):
            continue
        for item in content:
            if (
                isinstance(item, dict)
                and item.get("type") == "image"
                and isinstance(item.get("data"), str)
            ):
                return item["data"], item.get("mime_type", "image/png")

    raise RuntimeError("Gemini did not return an image.")


async def _read_reference_image(image: UploadFile) -> tuple[str, str]:
    mime_type = image.content_type or ""
    if mime_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError("Upload a PNG, JPG, or WebP image.")

    image_bytes = await image.read()
    if not image_bytes:
        raise ValueError("The uploaded image is empty.")
    if len(image_bytes) > MAX_UPLOAD_MB * 1024 * 1024:
        raise ValueError(f"Image must be {MAX_UPLOAD_MB} MB or smaller.")

    return base64.b64encode(image_bytes).decode("ascii"), mime_type


async def call_gemini(
    prompt: str,
    reference_image: UploadFile | None = None,
) -> str:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing. Add it to backend/.env.")

    image_prompt = f"{_load_image_guidance()}\n\nTask-specific instructions:\n{prompt}"
    inputs = [{"type": "text", "text": image_prompt}]
    if reference_image is not None:
        image_data, mime_type = await _read_reference_image(reference_image)
        inputs.append(
            {
                "type": "image",
                "data": image_data,
                "mime_type": mime_type,
            }
        )

    headers = {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
        "Api-Revision": "2026-05-20",
    }
    payload = {
        "model": GEMINI_MODEL,
        "input": inputs,
    }

    async with httpx.AsyncClient(timeout=240) as client:
        response = await client.post(
            GEMINI_INTERACTIONS_URL,
            headers=headers,
            json=payload,
        )

    logger.info("Gemini image request returned HTTP %s", response.status_code)
    try:
        response_data = response.json()
    except ValueError as exc:
        raise RuntimeError("Gemini returned a non-JSON response.") from exc

    if response.status_code >= 400:
        error = response_data.get("error", {})
        message = (
            error.get("message", response.text[:1000])
            if isinstance(error, dict)
            else response.text[:1000]
        )
        raise GeminiAPIError(
            response.status_code,
            f"Gemini API error ({response.status_code}): {message}",
        )

    image_data, mime_type = _extract_image(response_data)
    return f"data:{mime_type};base64,{image_data}"


async def generate_image(
    prompt: str,
    size: str = "1024x1024",
    quality: str = "medium",
    aspect_ratio: str = "1:1",
    style: str = "Realistic",
    background: str = "White studio",
    reference_image: UploadFile | None = None,
) -> str:
    final_prompt = (
        f"Create a professional ecommerce product image. {prompt}. "
        f"Visual style: {style}. Background: {background}. "
        f"Target aspect ratio: {aspect_ratio}. Requested image size: {size}. "
        f"Quality preference: {quality}. "
        "If a reference image is provided, preserve the product's recognizable "
        "shape, color, and details as closely as possible."
    )
    return await call_gemini(final_prompt, reference_image)


async def edit_image(
    image: UploadFile,
    prompt: str,
    size: str = "1024x1024",
    quality: str = "medium",
) -> str:
    edit_prompt = (
        "Edit this existing product image according to the instruction below. "
        "Preserve all elements not explicitly requested to change, including "
        f"product identity, shape, camera angle, and composition. Instruction: {prompt}. "
        f"Requested image size: {size}. Quality preference: {quality}."
    )
    return await call_gemini(edit_prompt, image)
