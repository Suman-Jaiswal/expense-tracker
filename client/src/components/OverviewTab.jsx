import React from "react";

export default function OverviewTab({ resource, resourceType }) {
  return (
    <div>
      {" "}
      {resourceType}
      {JSON.stringify(resource, null, 2)}{" "}
    </div>
  );
}
