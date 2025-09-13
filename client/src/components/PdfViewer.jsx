export function PdfViewer({ statement }) {
  const filename = `${statement.resourceIdentifier}_${statement.period.start}_to_${statement.period.end}.pdf`;
  if (!statement || !statement.driveFileWebContentLink) {
    return <div>No statement available</div>;
  }
  return (
    <div>
      {/* Inline viewer */}
      <iframe
        src={`${statement.driveFileWebViewLink}#toolbar=0&navpanes=0&scrollbar=0`}
        width="100%"
        height={window.innerHeight * 0.85}
        style={{ border: "none" }}
        title="PDF Viewer"
      />

      {/* Download button */}
      <a href={statement.driveFileWebViewLink} download={filename}>
        <button>Download PDF</button>
      </a>
    </div>
  );
}
