export const markdownExample: string = `Here is an example of a robust Markdown document. It showcases various syntax elements, from technical code blocks to organized data structures, perfect for testing a renderer or organizing a project.

---

# Project "Nebula": System Documentation

## 1. Overview

Project Nebula is a multi-language microservice architecture designed for high-concurrency data processing. This document serves as a reference for formatting and standard practices.

### Key Features

- **Scalability:** Horizontal scaling across multiple nodes.
- **Performance:** Low-latency response times (under 50ms).
- **Security:** End-to-end encryption using TLS 1.3.

---

## 2. Technical Implementation

### Data Structures

We utilize a specific schema for our user metadata. The following table outlines the current requirements:

| Field         | Type      | Required | Description                        |
| ------------ | --------- | -------- | --------------------------------- |
| \`user_id\`    | UUID      | Yes      | Unique identifier for the account |
| \`email\`      | String    | Yes      | Primary contact address           |
| \`tier\`       | Enum      | No       | Values: \`basic\`, \`pro\`, \`ultra\`   |
| \`last_login\` | Timestamp | No       | UTC ISO-8601 format               |

### Logic and Calculation

In our billing module, we calculate the discount rate using the following logic where $x$ represents the number of active months:

$$f(x) = \\frac{x}{x + 10} \\times 100$$

---

## 3. Code Examples

### Backend (Python)

The backend handles the core business logic and database interactions.

\`\`\`python
import hashlib

def hash_password(password: str) -> str:
    """Generates a secure SHA-256 hash for storage."""
    salt = "nebula_system_2026"
    db_string = password + salt
    return hashlib.sha256(db_string.encode()).hexdigest()

print(hash_password("admin_pass_123"))
\`\`\`

### Frontend (React/JSX)

The UI is built with a focus on responsiveness and modularity.

\`\`\`javascript
import React from "react";

const StatusBadge = ({ active }) => {
  return (
    <div className={active ? "bg-green-500" : "bg-red-500"}>
      {active ? "System Online" : "System Offline"}
    </div>
  );
};

export default StatusBadge;
\`\`\`

---

## 4. Development Workflow

1. **Clone the repository**
- Use \`git clone https://github.com/org/nebula.git\`

2. **Install Dependencies**
- \`npm install\` for the frontend
- \`pip install -r requirements.txt\` for the backend

3. **Run Migrations**
- Ensure the local Postgres instance is running.

> **Warning:** Never commit your \`.env\` file to the public repository. Ensure it is listed in your \`.gitignore\`.

---

## 5. Media & Links

For further details, check the following resources:
- [Official Documentation](https://example.com)
- [API Endpoint Reference](https://www.google.com/search?q=https://api.example.com/v1)

Check out our architecture flow:

---

**Would you like me to convert this into a specific file format like a PDF or a README.md file for a GitHub repository?**`;
