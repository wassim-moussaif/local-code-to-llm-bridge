import setuptools

setuptools.setup(
    name="codebridge",
    version="1.0.0",
    description="Local Code-to-LLM Bridge server on localhost:3387",
    py_modules=["main", "security", "file_service", "folder_picker"],
    package_dir={"": "backend"},
    install_requires=[
        "fastapi>=0.110.0",
        "uvicorn[standard]>=0.28.0",
        "pydantic>=2.6.0"
    ],
    entry_points={
        "console_scripts": [
            "codebridge = main:run_cli",
        ],
    },
    python_requires=">=3.8",
)
