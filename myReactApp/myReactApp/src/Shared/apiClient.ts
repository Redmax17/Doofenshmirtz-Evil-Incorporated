//File that helps PAges connect to the backend as it will not always be hosted in the same place as the Front end and once go to dev this will be necessary
//Need to merge this and other versions carefully as this file will be built out simultaneously

// NOTE: keep this centralized so pages can call your backend regardless of where the frontend is hosted.
const apiBaseUrl = "http://localhost:5000";

function getAuthHeader() {
  // Authentication check
  const tokenValue = localStorage.getItem("authToken") || "";
  return tokenValue ? { Authorization: `Bearer ${tokenValue}` } : {};
}

function buildHeaders(extraHeadersValue: Record<string, string> = {}): HeadersInit {
  // Forwards auth token
  return {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...extraHeadersValue,
  };
}

async function parseJsonSafe(resValue: Response): Promise<any> {
  // Avoid crashing when an endpoint returns non-JSON or an empty body.
  const contentTypeValue = resValue.headers.get("content-type") || "";
  if (!contentTypeValue.includes("application/json")) return null;
  try {
    return await resValue.json();
  } catch {
    return null;
  }
}

export const apiClient = {
  //API call helper func
  async get<T>(pathValue: string): Promise<T> {
    const resValue = await fetch(`${apiBaseUrl}${pathValue}`, {
      method: "GET",
      headers: buildHeaders(),
    });

    if (!resValue.ok) {
      const dataValue = await parseJsonSafe(resValue);
      const textValue = dataValue?.error ? String(dataValue.error) : await resValue.text();
      throw new Error(textValue || `Request failed: ${resValue.status}`);
    }

    const dataValue = await parseJsonSafe(resValue);
    return dataValue as T;
  },

  async post<T>(pathValue: string, bodyValue: unknown): Promise<T> {
    const resValue = await fetch(`${apiBaseUrl}${pathValue}`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(bodyValue),
    });

    if (!resValue.ok) {
      const dataValue = await parseJsonSafe(resValue);
      const textValue = dataValue?.error ? String(dataValue.error) : await resValue.text();
      throw new Error(textValue || `Request failed: ${resValue.status}`);
    }

    const dataValue = await parseJsonSafe(resValue);
    return dataValue as T;
  },

  async put<T>(pathValue: string, bodyValue: unknown): Promise<T> {
    const resValue = await fetch(`${apiBaseUrl}${pathValue}`, {
      method: "PUT",
      headers: buildHeaders(),
      body: JSON.stringify(bodyValue),
    });

    if (!resValue.ok) {
      const dataValue = await parseJsonSafe(resValue);
      const textValue = dataValue?.error ? String(dataValue.error) : await resValue.text();
      throw new Error(textValue || `Request failed: ${resValue.status}`);
    }

    const dataValue = await parseJsonSafe(resValue);
    return dataValue as T;
  },

  async delete<T>(pathValue: string): Promise<T> {
    const resValue = await fetch(`${apiBaseUrl}${pathValue}`, {
      method: "DELETE",
      headers: buildHeaders({ "Content-Type": "application/json" }),
    });

    if (!resValue.ok) {
      const dataValue = await parseJsonSafe(resValue);
      const textValue = dataValue?.error ? String(dataValue.error) : await resValue.text();
      throw new Error(textValue || `Request failed: ${resValue.status}`);
    }

    const dataValue = await parseJsonSafe(resValue);
    return (dataValue ?? ({} as T)) as T;
  },
};
