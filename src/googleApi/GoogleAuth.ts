/* eslint-disable @typescript-eslint/no-var-requires */
import { getAT, getET, getRT, setAT, setET, setRT } from './LocalStorage';
import { Notice, Platform } from 'obsidian';
import KanbanPlugin from 'src/main';
import open from 'open';
import http from 'http';
import url from 'url';
import { OAuth2Client } from 'google-auth-library';

export async function getGoogleAuthToken(
  plugin: KanbanPlugin
): Promise<string> {
  if (getRT() == '') return;

  if (
    getET() == 0 ||
    getET() == undefined ||
    isNaN(getET()) ||
    getET() < +new Date()
  ) {
    if (getRT() != '') {
      const refreshBody = {
        client_id: plugin.settings['googleClientId'],
        client_secret: plugin.settings['googleClientSecret'],
        grant_type: 'refresh_token',
        refresh_token: getRT(),
      };
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: JSON.stringify(refreshBody),
      });

      const tokenData = await response.json();

      setAT(tokenData.access_token);
      setET(+new Date() + tokenData.expires_in);
    }
  }

  return getAT();
}

export async function LoginGoogle(plugin: KanbanPlugin) {
  if (Platform.isDesktop) {
    const destroyer = require('server-destroy');
    const oAuth2Client = new OAuth2Client(
      plugin.settings['googleClientId'],
      plugin.settings['googleClientSecret'],
      'http://127.0.0.1:42813/callback'
    );
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      scope: 'https://www.googleapis.com/auth/tasks',
      access_type: 'offline',
      prompt: 'consent',
    });

    const server = http
      .createServer(async (req: any, res: any) => {
        try {
          if (req.url.indexOf('/callback') > -1) {
            // acquire the code from the querystring, and close the web server.
            const qs = new url.URL(req.url, 'http://localhost:42813')
              .searchParams;
            const code = qs.get('code');
            res.end('Authentication successful! Please return to obsidian.');
            (server as any).destroy();

            // Now that we have the code, use that to acquire tokens.
            const r = await oAuth2Client.getToken(code);

            setRT(r.tokens.refresh_token);
            setAT(r.tokens.access_token);
            setET(r.tokens.expiry_date);

            console.info('Tokens acquired.');
          }
        } catch (e) {
          console.error('Error getting Tokens.');
        }
      })
      .listen(42813, () => {
        // open the browser to the authorize url to start the workflow
        open(authorizeUrl, { wait: false }).then((cp: any) => cp.unref());
      });

    destroyer(server);
  } else {
    new Notice("Can't use OAuth on this device");
  }
}
