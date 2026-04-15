import fitz # PyMuPDF
import sys

def extract_pdf(pdf_path, keywords):
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"Error opening PDF: {e}")
        return

    results = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text().lower()
        found_keywords = [kw for kw in keywords if kw.lower() in text]
        if found_keywords:
            results.append(f"--- Page {page_num+1} (Keywords: {', '.join(found_keywords)}) ---\n")
            # Extract a snippet around the keywords (up to 500 chars)
            # For simplicity let's just dump the whole page if it's not too long, or limit to 1000 chars
            snippet = text[:1500].replace('\n', ' ')
            results.append(snippet + "\n\n")
            
    with open("pdf_extraction.txt", "w", encoding="utf-8") as f:
        f.writelines(results)
    
    print(f"Extracted {len(results)//2} pages with keywords.")

if __name__ == "__main__":
    pdf_path = "C:\\Users\\user\\Downloads\\Telegram Desktop\\Qurilish_chizmachiligi.pdf"
    keywords = ["oyna", "deraza", "eshik", "tom", "styajka", "beton", "uy", "zina", "pol", "o'lcham"]
    extract_pdf(pdf_path, keywords)
