const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:8080";

export async function fetchGet(endpoint) {
    try {
        const response = await fetch(BASE_URL + endpoint, {
            credentials: 'include'
        });
        return await response.json();
    } catch (error) {
        console.error("Fetch GET error:", error);
        return { error: "Network error" };
    }
}

export async function fetchPost(endpoint, body) {
    try {
        const response = await fetch(BASE_URL + endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        return await response.json();
    } catch (error) {
        console.error("Fetch POST error:", error);
        return { error: "Network error" };
    }
}

export async function fetchDelete(endpoint) {
    try {
        const response = await fetch(BASE_URL + endpoint, {
            method: 'DELETE',
            credentials: 'include'
        });
        return await response.json();
    } catch (error) {
        console.error("Fetch DELETE error:", error);
        return { error: "Network error" };
    }
}

export async function fetchPostFormData(endpoint, formData) {
    try {
        const response = await fetch(BASE_URL + endpoint, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        return await response.json();
    } catch (error) {
        console.error("Fetch POST FormData error:", error);
        return { error: "Network error" };
    }
}
