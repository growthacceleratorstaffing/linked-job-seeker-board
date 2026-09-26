// Extracts plain text from an uploaded CV so matching can use its contents.
export async function extractCvText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".pdf")) {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      }
      return pages.join("\n").slice(0, 50000);
    }
    if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value.slice(0, 50000);
    }
    if (name.endsWith(".txt")) return (await file.text()).slice(0, 50000);
  } catch (error) {
    console.warn("Could not read CV text", error);
  }
  return "";
}
