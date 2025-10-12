import { Card, Col, Row, Skeleton } from "antd";

export const DashboardSkeleton = () => {
  return (
    <div style={{ padding: "24px" }}>
      {/* Summary Cards Skeleton */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Skeleton */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div style={{ padding: "24px" }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index} style={{ marginBottom: 16 }}>
          <Skeleton active paragraph={{ rows: 1 }} />
        </Card>
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <Card>
      <Skeleton active avatar paragraph={{ rows: 3 }} />
    </Card>
  );
};
