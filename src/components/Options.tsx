import React from "react";
import { DEFAULT_ENDPOINT } from "../lib/constants";

export function Options() {
  const [endpoint, setEndpoint] = React.useState<string>("");

  React.useEffect(() => {
    chrome.storage.sync.get(
      {
        endpoint: DEFAULT_ENDPOINT,
      },
      (data) => {
        setEndpoint(data.endpoint);
      }
    );
  }, []);

  return (
    <div>
      <h1>Options</h1>
      <label>Segment Anything Model endpoint</label>
      <div>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
        />
      </div>
      <button
        onClick={() => {
          chrome.storage.sync.set(
            {
              endpoint: endpoint,
            },
            () => {
              setEndpoint(endpoint);
            }
          );
        }}
      >
        Save
      </button>
      <button
        onClick={() => {
          chrome.storage.sync.set(
            {
              endpoint: DEFAULT_ENDPOINT,
            },
            () => {
              setEndpoint(DEFAULT_ENDPOINT);
            }
          );
        }}
      >
        Reset to Default
      </button>
    </div>
  );
}
