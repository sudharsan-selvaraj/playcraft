// API service for Playcraft

const getServerUrl = () => {
  const url = (window as any).SERVER_URL;
  if (!url) throw new Error('window.SERVER_URL is not defined');
  return url;
};

const getSessionId = () => {
  const id = (window as any).SESSION_ID;
  if (!id) throw new Error('window.SESSION_ID is not defined');
  return id;
};

const BaseUrl = () => `${getServerUrl()}/api`;

async function handleResponse(response: Response) {
  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('Invalid JSON response');
  }
  if (!response.ok) {
    const error = data?.error || response.statusText || 'API Error';
    throw new Error(error);
  }
  return data;
}

export async function listSessions() {
  try {
    const response = await fetch(`${BaseUrl()}/session`);
    return await handleResponse(response);
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch sessions' };
  }
}

export async function navigateToUrl(url: string) {
  try {
    const response = await fetch(`${BaseUrl()}/session/${getSessionId()}/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return await handleResponse(response);
  } catch (error: any) {
    return { error: error.message || 'Failed to navigate to URL' };
  }
}

export async function executeCode(code: string) {
  try {
    const response = await fetch(`${BaseUrl()}/session/${getSessionId()}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    return await handleResponse(response);
  } catch (error: any) {
    return { error: error.message || 'Failed to execute code' };
  }
}


