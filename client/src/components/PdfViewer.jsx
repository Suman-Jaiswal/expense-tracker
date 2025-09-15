import { CloudDownloadOutlined } from "@ant-design/icons";
import { Button } from "antd";

export function PdfViewer({ statement }) {
  const filename = `${statement.resourceIdentifier}_${statement.period.start}_to_${statement.period.end}.pdf`;
  if (!statement || !statement.driveFileWebContentLink) {
    return <div>No statement available</div>;
  }
  return (
    <div>
      {/* Inline viewer */}
      <iframe
        src={`https://drive.google.com/file/d/${statement.driveFileId}/preview`}
        width="100%"
        height={window.innerHeight * 0.8}
        style={{ border: "none" }}
        title="PDF Viewer"
      />

      {/* Download button */}
      <div
        style={{
          textAlign: "center",
          width: "100%",
        }}
      >
        <Button
          icon={<CloudDownloadOutlined />}
          type="primary"
          style={{ marginTop: 10 }}
          onClick={() => {
            window.open(statement.driveFileWebContentLink);
          }}
        >
          Download
        </Button>
      </div>
    </div>
  );
}
