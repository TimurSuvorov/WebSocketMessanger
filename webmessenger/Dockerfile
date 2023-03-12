FROM python
MAINTAINER Suvorov Timur

# set work directory
WORKDIR /webmessenger_app/

# set app-environment variables
ENV PYTHONDONTWRITEBYTECODE 1  # Prevents Python from writing pyc files to disc
ENV PYTHONUNBUFFERED 1  #Prevents Python from buffering stdout and stderr.

# install dependencies
RUN pip install --upgrade pip
COPY ./requirements.txt /webmessenger_app/requirements.txt
RUN chmod +x /webmessenger_app/requirements.txt
RUN pip install -r requirements.txt

EXPOSE 8000
ENV CELERY_BROKER='redis'
# copy project
COPY . /webmessenger_app/

CMD ["python", "./manage.py", "runserver", "0.0.0.0:8000"]