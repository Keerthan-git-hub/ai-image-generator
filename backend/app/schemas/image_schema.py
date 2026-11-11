from pydantic import BaseModel

class ImageResponse(BaseModel):
    image_data_url: str
