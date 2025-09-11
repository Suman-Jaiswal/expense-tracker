import fs from "fs";
import { google } from "googleapis";
import http from "http";
import open from "open";
import path from "path";
import destroyer from "server-destroy"; // npm install open server-destroy

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
// relative path to the credentials.json file
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOKEN_PATH = path.join(process.cwd(), "token.json");

function getAccessToken(oAuth2Client, authUrl) {
  return new Promise((resolve, reject) => {
    const server = http
      .createServer(async (req, res) => {
        try {
          if (req.url.indexOf("/?code=") > -1) {
            const qs = new URL(req.url, "http://localhost:3000").searchParams;
            const code = qs.get("code");
            console.log(code);

            res.end(
              "Authentication successful! Please return to the terminal."
            );
            server.destroy();
            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);
            resolve(oAuth2Client);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
            console.log("Token stored to", TOKEN_PATH);
          }
        } catch (e) {
          reject(e);
        }
      })
      .listen(3000, () => {
        // open browser automatically
        open(authUrl, { wait: false }).then((cp) => cp.unref());
      });
    destroyer(server);
  });
}

export async function authorize() {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const credentials = JSON.parse(content);
  const { client_secret, client_id, redirect_uris } = credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
    return oAuth2Client;
  }

  // First-time login
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);

  // Ask user for code
  await getAccessToken(oAuth2Client, authUrl);

  return oAuth2Client;
}
