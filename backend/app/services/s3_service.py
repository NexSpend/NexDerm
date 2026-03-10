import boto3
from botocore.exceptions import ClientError
from io import BytesIO
from app.core.config import settings


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