import { http, https } from "follow-redirects";

export async function getRedirectUrl(url: string): Promise<string> {
  try {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === "https:" ? https : http;
    const headers = {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    return new Promise((resolve, reject) => {
      const request = protocol.request(url, { headers, followRedirects: true }, (response: any) => {
        resolve(response.responseUrl);
      });
      request.on("error", (error: any) => {
        reject(error);
      });
      request.end();
    });
  } catch (err) {
    return url;
  }
}

(async () => {
  try {
    const url = await getRedirectUrl("https://netbanking.hdfcbank.com");
    console.log(url);
  } catch (err) {
    // console.log(err);
  }
})();
