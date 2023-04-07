# Magic Copy

Magic Copy is a Chrome extension that uses Meta's [Segment Anything Model](https://segment-anything.com/) to extract a foreground object from an image and copy it to the clipboard.

https://user-images.githubusercontent.com/511342/230546504-1ed11d08-3dda-422c-b304-e77dbb664e80.mp4

## Installation

[![Available on the Chrome Web Store](https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/UV4C4ybeBTsZt43U4xis.png)](https://chrome.google.com/webstore/detail/nnifclicibdhgakebbnbfmomniihfmkg)

(This might not be available yet, as the extension is still in review.)

Alternatively, the extension can be installed manually:

1. Download the latest `magic-copy.zip` from [releases](https://github.com/kevmo314/magic-copy/releases).
2. Extract the ZIP file.
3. In Chrome, go to `chrome://extensions/`, enable "Developer mode", and click "Load unpacked".
4. Select the folder where the extension was extracted.

## Implementation

This extension uses the same procedure as the [Segment Anything Model demo](https://segment-anything.com/demo) to extract a foreground object from an image. The only difference is that the extracted object is copied to the clipboard instead of being displayed on the page.

## Building

### Manually

Build the extension with `npm` and then run the included `./buildcrx.sh` script to generate the `crx` file:

```sh
npm ci
npm run build
./buildcrx.sh -d dist
```

### Docker

A `Dockerfile` is provided to cleanly build the `crx` file. To build the extension, run:

```sh
docker build --output out .
```
