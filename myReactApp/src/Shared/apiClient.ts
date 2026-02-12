//File that helps PAges connect to the backend as it will not always be hosted in the same place as the Front end and once go to dev this will be necessary
//Need to merge this and other versions carefully as this file will be built out simultaneously

const apiBaseUrl = "http://localhost:5000"

function getAuthHeader() {
  //authentication check
  const tokenValue = localStorage.getItem("authToken") || "";
  return tokenValue ? { Authorization: `Bearer ${tokenValue}` } : {};
}

function buildHeaders(): HeadersInit {
  //forwards auth token
  const tokenValue = localStorage.getItem("authToken");

  const headersValue: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (tokenValue) {
    headersValue["Authorization"] = `Bearer ${tokenValue}`;
  }

  return headersValue;
}


export const apiClient = {
  //API call helper func
  async get<T>(pathValue: string): Promise<T> {
    //Get call for server returns call result
    const resValue = await fetch(`${apiBaseUrl}${pathValue}`, {
      method: "GET",
      headers: buildHeaders(),
    });

    if (!resValue.ok) {
      const textValue = await resValue.text();
      throw new Error(textValue || `Request failed: ${resValue.status}`);
    }

    return (await resValue.json()) as T;
  },

  async post<T>(pathValue: string, bodyValue: unknown): Promise<T> {
    //post call for server returns call result
    const resValue = await fetch(`${apiBaseUrl}${pathValue}`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(bodyValue),
    });

    if (!resValue.ok) {
      const textValue = await resValue.text();
      throw new Error(textValue || `Request failed: ${resValue.status}`);
    }

    return (await resValue.json()) as T;
  },
};
