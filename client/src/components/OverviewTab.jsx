import React from "react";
import CardView from "./CardView";

export default function OverviewTab({ resources, resourceIdentifier }) {
  return (
    <div>
      {resourceIdentifier.includes("card") && (
        <CardView
          cardMetaData={
            resources.cards?.find(
              (card) => card.resourceIdentifier === resourceIdentifier
            ).metaData || {}
          }
        />
      )}
    </div>
  );
}
