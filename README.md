# Magic Copy

Magic Copy is a Chrome extension that uses Meta's [Segment Anything Model](https://segment-anything.com/) to extract a foreground object from an image and copy it to the clipboard.

## Installation

[![Available on the Chrome Web Store](https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/UV4C4ybeBTsZt43U4xis.png)](https://chrome.google.com/webstore/detail/nnifclicibdhgakebbnbfmomniihfmkg)

Alternatively, the extension can be installed manually:

1. Download the repository as a ZIP file.
2. Extract the ZIP file.
3. In Chrome, go to `chrome://extensions/`, enable "Developer mode", and click "Load unpacked".
4. Select the folder where the extension was extracted.

## Implementation

This extension uses the same procedure as the [Segment Anything Model demo](https://segment-anything.com/demo) to extract a foreground object from an image. The only difference is that the extracted object is copied to the clipboard instead of being displayed on the page.
