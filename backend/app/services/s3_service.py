# This file provides S3-related services for FastAPI endpoints, leveraging boto3 to
# interact with AWS S3 for file uploads and presigned URL generation.

import boto3
from botocore.exceptions import ClientError
from io import BytesIO
from app.core.config import settings

# The S3Service class encapsulates methods for uploading files to S3 and generating 
# presigned URLs for downloads and image access.
class S3Service:
    def __init__(self):
        self.bucket_name = settings.AWS_S3_BUCKET_NAME
        self.region = settings.AWS_REGION

        self.s3_client = boto3.client(
            "s3",
            region_name=self.region,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

    # This method uploads PDF bytes to S3, ensuring the content type is set to application/pdf
    def upload_pdf_bytes(self, pdf_bytes: bytes, s3_key: str) -> str:
        pdf_file = BytesIO(pdf_bytes)

        self.s3_client.upload_fileobj(
            pdf_file,
            self.bucket_name,
            s3_key,
            ExtraArgs={
                "ContentType": "application/pdf"
            }
        )

        return s3_key

    # This method uploads image bytes to S3, allowing for dynamic content type specification
    def upload_image_bytes(self, image_bytes: bytes, s3_key: str, content_type: str = "image/jpeg") -> str:
        image_file = BytesIO(image_bytes)

        self.s3_client.upload_fileobj(
            image_file,
            self.bucket_name,
            s3_key,
            ExtraArgs={
                "ContentType": content_type
            }
        )

        return s3_key

    # This method generates a presigned URL for downloading a report PDF, 
    # with appropriate response headers to trigger a download in the browser.
    def generate_presigned_download_url(self, s3_key: str, expires_in: int = 3600) -> str:
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": s3_key,
                    "ResponseContentType": "application/pdf",
                    "ResponseContentDisposition": 'attachment; filename="report.pdf"',
                },
                ExpiresIn=expires_in,
            )
            return url
        except ClientError as e:
            raise Exception(f"Could not generate presigned URL: {str(e)}")

    # This method generates a presigned URL for accessing an image, 
    # with headers set to display the image inline in the browser.
    def generate_presigned_image_url(self, s3_key: str, expires_in: int = 3600) -> str:
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": s3_key,
                    "ResponseContentDisposition": "inline",
                },
                ExpiresIn=expires_in,
            )
            return url
        except ClientError as e:
            raise Exception(f"Could not generate presigned image URL: {str(e)}")