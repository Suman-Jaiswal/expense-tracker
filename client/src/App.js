import { Layout, theme } from "antd";
import React, { useEffect } from "react";
import { getAllResources } from "./api";
import ContentPage from "./components/ContentPage";
import MenuBar from "./components/MenuBar";
const { Header, Content } = Layout;
const App = () => {
  const {
    token: { colorBgContainer, borderRadiusLG, colorInfoBg },
  } = theme.useToken();
  const [resources, setResources] = React.useState(null);
  const [resourceIdentifier, setResourceIdentifier] = React.useState(null);

  useEffect(() => {
    getAllResources()
      .then((data) => setResources(data))
      .catch(console.error);
  }, []);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout>
        <MenuBar
          resources={resources}
          setResourceIdentifier={setResourceIdentifier}
        />
        <Content
          style={{
            margin: 12,
            padding: "0 16px",
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <ContentPage
            resources={resources}
            resourceIdentifier={resourceIdentifier}
          />
        </Content>
      </Layout>
    </Layout>
  );
};
export default App;
