import qs from "query-string";
import axios from "axios";
import "dotenv/config";

const ZOOM_OAUTH_ENDPOINT = "https://zoom.us/oauth/token";
const ZOOM_ACCOUNT_ID = process.env.ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.CLIENT_SECRET;
const API_BASE_URL = "https://api.zoom.us/v2";

export const getToken = async () => {
  try {
    const request = await axios.post(
      ZOOM_OAUTH_ENDPOINT,
      qs.stringify({
        grant_type: "account_credentials",
        account_id: ZOOM_ACCOUNT_ID,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    const { access_token, expires_in } = await request.data;
    console.log(expires_in);
    const headerConfig = {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    };
    return {
      access_token,
      expires_in,
      error: null,
      headerConfig: headerConfig,
    };
  } catch (error) {
    return { access_token: null, expires_in: null, error, headerConfig: null };
  }
};

export const createMeeting = async (headerConfig) => {
  const date = new Date();
  try {
    const payload = {
      start_time: date,
      type: 2,
      duration: "30",
      topic: "New meeting",
      settings: {join_before_host: true, waiting_room: false},
      
    };
    const response = await axios.post(
      `${API_BASE_URL}/users/me/meetings`,
      payload,
      headerConfig
    );
    const data = response.data;
    return {
      id: data.id,
      password: data.password,
      join_url: data.join_url,
    };
  } catch (error) {
    console.log(error);
  }
};

export const getMeeting = async (id, headerConfig) => {
  try {
    const request = await axios.get(`${API_BASE_URL}/meetings/${id}`, headerConfig);
    return request.data;
  } catch (error) {
    console.log(error.response.status);
    return {status: 'error'};
  }
}

