import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from app.schemas.image_schema import ImageResponse
from app.services.gemini_image_service import (
    GeminiAPIError,
    edit_image,
    generate_image,
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/generate", response_model=ImageResponse)
async def generate(
    prompt: str = Form(...),
    size: str = Form("1024x1024"),
    quality: str = Form("medium"),
    aspect_ratio: str = Form("1:1"),
    style: str = Form("Realistic"),
    background: str = Form("White studio"),
    reference_image: UploadFile | None = File(default=None),
):
    if not prompt.strip():
        raise HTTPException(status_code=400, detail="Please enter an image prompt.")
    try:
        result = await generate_image(
            prompt=prompt.strip(), size=size, quality=quality,
            aspect_ratio=aspect_ratio, style=style, background=background,
            reference_image=reference_image,
        )
        return ImageResponse(image_data_url=result)
    except GeminiAPIError as exc:
        if exc.status_code == 429:
            logger.warning("Gemini image generation quota/rate limit reached: %s", exc)
            raise HTTPException(status_code=429, detail=str(exc)) from exc
        logger.exception("Gemini image generation request failed")
        raise HTTPException(status_code=502, detail="Image generation failed. Check Gemini API access and backend logs.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        # Avoid returning secrets or raw internal traces to clients.
        logger.exception("Image generation failed")
        raise HTTPException(status_code=502, detail="Image generation failed. Check API key, model access, and backend logs.") from exc

@router.post("/edit", response_model=ImageResponse)
async def edit(
    prompt: str = Form(...),
    size: str = Form("1024x1024"),
    quality: str = Form("medium"),
    image: UploadFile = File(...),
):
    if not prompt.strip():
        raise HTTPException(status_code=400, detail="Please enter an edit instruction.")
    try:
        result = await edit_image(image=image, prompt=prompt.strip(), size=size, quality=quality)
        return ImageResponse(image_data_url=result)
    except GeminiAPIError as exc:
        if exc.status_code == 429:
            logger.warning("Gemini image editing quota/rate limit reached: %s", exc)
            raise HTTPException(status_code=429, detail=str(exc)) from exc
        logger.exception("Gemini image editing request failed")
        raise HTTPException(status_code=502, detail="Image editing failed. Check Gemini API access and backend logs.") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Image editing failed")
        raise HTTPException(status_code=502, detail="Image editing failed. Check API key, model access, and backend logs.") from exc
