// lib/backup/googleDriveBackup.ts

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export class GoogleDriveBackup {
  private tokenClient: any;
  private gapiInited = false;
  private gisInited = false;

  async init(): Promise<void> {
    await this.loadGapi();
    await this.loadGis();
  }

  private loadGapi(): Promise<void> {
    return new Promise((resolve) => {
      if (window.gapi && window.gapi.client) {
        this.initGapiClient().then(resolve);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = async () => {
        await this.initGapiClient();
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  private async initGapiClient(): Promise<void> {
    await new Promise((resolve) => {
      window.gapi.load('client', resolve);
    });
    await window.gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    this.gapiInited = true;
  }

  private loadGis(): Promise<void> {
    return new Promise((resolve) => {
      if (window.google && window.google.accounts) {
        this.initGisClient();
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        this.initGisClient();
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  private initGisClient(): void {
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // defined later
    });
    this.gisInited = true;
  }

  async signIn(): Promise<boolean> {
    if (!this.gapiInited || !this.gisInited) {
      await this.init();
    }
    
    return new Promise((resolve) => {
      this.tokenClient.callback = (resp: any) => {
        if (resp.error !== undefined) {
          console.error('Sign in error:', resp.error);
          resolve(false);
        }
        resolve(true);
      };
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  async signOut(): Promise<void> {
    const token = window.gapi.client.getToken();
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken(null);
    }
  }

  async isSignedIn(): Promise<boolean> {
    if (!window.gapi || !window.gapi.client) return false;
    const token = window.gapi.client.getToken();
    return !!token;
  }

  async backupToDrive(data: any, fileName: string = `mochido-backup-${new Date().toISOString().split('T')[0]}.json`): Promise<string | null> {
    if (!await this.isSignedIn()) {
      const signedIn = await this.signIn();
      if (!signedIn) return null;
    }

    const fileContent = JSON.stringify(data, null, 2);
    const blob = new Blob([fileContent], { type: 'application/json' });
    
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: ['appDataFolder'],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const token = window.gapi.client.getToken();
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({ Authorization: `Bearer ${token.access_token}` }),
      body: form,
    });

    const result = await response.json();
    return result.id || null;
  }

  async listBackups(): Promise<Array<{ id: string; name: string; createdTime: string }>> {
    if (!await this.isSignedIn()) return [];

    const response = await window.gapi.client.drive.files.list({
      q: `'appDataFolder' in parents and mimeType='application/json'`,
      spaces: 'appDataFolder',
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
    });

    return response.result.files || [];
  }

  async restoreFromDrive(fileId: string): Promise<any> {
    if (!await this.isSignedIn()) return null;

    const token = window.gapi.client.getToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: new Headers({ Authorization: `Bearer ${token.access_token}` }),
    });

    const content = await response.text();
    return JSON.parse(content);
  }

  async deleteBackup(fileId: string): Promise<void> {
    if (!await this.isSignedIn()) return;
    await window.gapi.client.drive.files.delete({ fileId });
  }
}

export const driveBackup = new GoogleDriveBackup();