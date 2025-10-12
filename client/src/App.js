import { Alert, Layout, Spin, theme } from "antd";
import { useState } from "react";
import ContentPage from "./components/ContentPage";
import ErrorBoundary from "./components/ErrorBoundary";
import MenuBar from "./components/MenuBar";
import MobileBottomNav from "./components/MobileBottomNav";
import { useApp } from "./context/AppContext";
import { featureFlag } from "./featureFlag";

const { Content } = Layout;

const App = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const { state, actions } = useApp();
  const { resources, resourceIdentifier, loading, error } = state;
  const { setResourceIdentifier } = actions;
  const [mobileNav, setMobileNav] = useState("dashboard");

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Spin size="large" tip="Loading resources..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "50px" }}>
        <Alert
          message="Error Loading Resources"
          description={error}
          type="error"
          showIcon
          closable
        />
      </div>
    );
  }

  const handleMobileNavChange = (key) => {
    console.log("Mobile nav clicked:", key);
    setMobileNav(key);
    setResourceIdentifier(key);
  };

  return (
    <ErrorBoundary>
      <Layout style={{ minHeight: "100vh" }}>
        <Layout>
          {featureFlag.isSideMenuEnabled && (
            <MenuBar
              resources={resources}
              setResourceIdentifier={(key) => {
                console.log("Sidebar menu set resource:", key);
                setResourceIdentifier(key);
              }}
            />
          )}

          <Content
            style={{
              padding: "0 0",
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <ContentPage
              setResourceIdentifier={setResourceIdentifier}
              resources={resources}
              resourceIdentifier={resourceIdentifier}
            />
          </Content>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav
            activeKey={mobileNav}
            onChange={handleMobileNavChange}
          />
        </Layout>
      </Layout>
    </ErrorBoundary>
  );
};

export default App;
