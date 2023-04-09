FROM python:3.10

COPY requirements.txt /app/requirements.txt

# Install dependencies
RUN pip install -r /app/requirements.txt

WORKDIR /app

RUN wget https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth

COPY . /app

EXPOSE 8000

# Run the application
CMD ["python", "app.py"]