import base64
import io

import flask
import numpy as np
from PIL import Image
from segment_anything import SamPredictor, sam_model_registry

sam = sam_model_registry["vit_h"](checkpoint="sam_vit_h_4b8939.pth")
sam.to(device='cuda')
predictor = SamPredictor(sam)

app = flask.Flask(__name__)

@app.route('/', methods=['POST'])
def index():
    image = np.array(Image.open(io.BytesIO(flask.request.data)).convert("RGB"))
    predictor.set_image(image)
    image_embedding = predictor.get_image_embedding().cpu().numpy().tobytes()
    # convert the image embedding to bytes
    return flask.jsonify([base64.b64encode(image_embedding).decode('ascii')])
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8045)