from fastapi import APIRouter, File, HTTPException, UploadFile

import fitz  # PyMuPDF

router = APIRouter()


@router.post("/parse")
async def parse_file(file: UploadFile = File(...)):
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in ("pdf", "txt"):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported")

    content = await file.read()

    if ext == "pdf":
        try:
            doc = fitz.open(stream=content, filetype="pdf")
            text = "".join(page.get_text() for page in doc)
            page_count = len(doc)
            doc.close()
            return {"text": text.strip(), "page_count": page_count, "file_name": filename}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF parsing failed: {e}")

    # TXT
    try:
        text = content.decode("utf-8")
        return {"text": text.strip(), "page_count": 1, "file_name": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text parsing failed: {e}")
