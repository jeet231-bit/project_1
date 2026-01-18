# spndwisee Backend

This directory contains the FastAPI backend for the spndwisee application.

## Setup

1.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

2.  **Configure environment variables:**
    - Create a `.env` file in this directory by copying the `.env.example` file.
    - Fill in the required Supabase credentials in the `.env` file.

## Running the Application

To run the backend development server, execute the following command from within the `/backend` directory:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
