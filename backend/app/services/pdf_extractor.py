"""PDF Extraction Service - Extracts text from PDFs using pdfplumber with OCR fallback."""

import pdfplumber
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class PDFExtractor:
    """Extract text content from PDF files."""

    @staticmethod
    def extract_text(file_bytes: bytes) -> dict:
        """
        Extract text from a PDF file.
        Returns dict with text content, page count, and metadata.
        """
        try:
            result = {
                "text": "",
                "pages": [],
                "page_count": 0,
                "tables": [],
                "extraction_method": "pdfplumber"
            }

            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                result["page_count"] = len(pdf.pages)

                for i, page in enumerate(pdf.pages):
                    page_text = page.extract_text() or ""
                    result["pages"].append({
                        "page_number": i + 1,
                        "text": page_text
                    })
                    result["text"] += page_text + "\n\n"

                    # Extract tables if present
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            result["tables"].append({
                                "page": i + 1,
                                "data": table
                            })

            # If text extraction yielded very little, try OCR fallback
            if len(result["text"].strip()) < 50:
                logger.info("Low text content detected, attempting OCR fallback...")
                ocr_result = PDFExtractor._ocr_fallback(file_bytes)
                if ocr_result and len(ocr_result) > len(result["text"].strip()):
                    result["text"] = ocr_result
                    result["extraction_method"] = "ocr"

            return result

        except Exception as e:
            logger.error(f"PDF extraction failed: {str(e)}")
            raise ValueError(f"Failed to extract PDF content: {str(e)}")

    @staticmethod
    def _ocr_fallback(file_bytes: bytes) -> Optional[str]:
        """OCR fallback for scanned PDFs using pytesseract."""
        try:
            import pytesseract
            from PIL import Image
            from pdf2image import convert_from_bytes

            images = convert_from_bytes(file_bytes)
            text_parts = []

            for img in images:
                text = pytesseract.image_to_string(img)
                text_parts.append(text)

            return "\n\n".join(text_parts)

        except ImportError:
            logger.warning("OCR dependencies not available (pytesseract/pdf2image)")
            return None
        except Exception as e:
            logger.warning(f"OCR fallback failed: {str(e)}")
            return None

    @staticmethod
    def extract_metadata(file_bytes: bytes) -> dict:
        """Extract PDF metadata."""
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                return {
                    "page_count": len(pdf.pages),
                    "metadata": pdf.metadata or {}
                }
        except Exception:
            return {"page_count": 0, "metadata": {}}
