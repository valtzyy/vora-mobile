// API Base Configuration
// Untuk local development: ganti dengan IP laptop Anda (misal: 'http://192.168.1.10:8000')
export const API_BASE_URL = 'https://your-backend-url.com';

const TIMEOUT_MS = 15000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${TIMEOUT_MS / 1000}s. Please check your network connection.`);
    }
    if (error.message && error.message.includes('Network request failed')) {
      throw new Error(`Cannot connect to server at ${API_BASE_URL}. Ensure backend is running and URL is reachable.`);
    }
    throw error;
  }
}

export async function fetchScans() {
  const isPlaceholder = API_BASE_URL.includes('your-backend-url.com');

  if (isPlaceholder) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return [
      {
        id: 'scan-demo-1',
        created_at: new Date().toISOString(),
        dbh: 45.2,
        height: 18.5,
        biomass: 820.4,
        co2e: 1520,
        image_url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&auto=format&fit=crop&q=80',
        species_classification: {
          top_match: 'Pinus merkusii (Sumatran Pine)',
          confidence: 0.94,
        },
      },
      {
        id: 'scan-demo-2',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        dbh: 62.8,
        height: 24.1,
        biomass: 1450.0,
        co2e: 2680,
        image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80',
        species_classification: {
          top_match: 'Tectona grandis (Teak)',
          confidence: 0.89,
        },
      },
      {
        id: 'scan-demo-3',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        dbh: 32.0,
        height: 14.2,
        biomass: 410.5,
        co2e: 760,
        image_url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
        species_classification: {
          top_match: 'Swietenia macrophylla (Mahogany)',
          confidence: 0.91,
        },
      },
    ];
  }

  const res = await fetchWithTimeout(`${API_BASE_URL}/scans`);
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Server returned HTTP ${res.status}: ${errorText || res.statusText}`);
  }
  return await res.json();
}

export async function uploadScan(videoFile: any) {
  if (!videoFile || !videoFile.uri) {
    throw new Error('Invalid video file selected.');
  }

  const isPlaceholder = API_BASE_URL.includes('your-backend-url.com');
  if (isPlaceholder) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      job_id: `job-${Date.now()}`,
      status: 'processing',
    };
  }

  const formData = new FormData();
  formData.append('video', {
    uri: videoFile.uri,
    name: videoFile.name || 'tree_scan.mp4',
    type: videoFile.mimeType || 'video/mp4',
  } as any);

  const res = await fetchWithTimeout(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Upload failed with HTTP ${res.status}: ${errorText || res.statusText}`);
  }

  return await res.json();
}

export async function fetchScanResult(jobId: string) {
  if (!jobId) {
    throw new Error('Job ID is missing.');
  }

  const isPlaceholder = API_BASE_URL.includes('your-backend-url.com') || jobId.startsWith('job-') || jobId.startsWith('scan-demo-');
  if (isPlaceholder) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      status: 'completed',
      result: {
        id: jobId,
        created_at: new Date().toISOString(),
        dbh: 48.6,
        height: 21.3,
        biomass: 980.2,
        co2e: 1815,
        image_url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&auto=format&fit=crop&q=80',
        species_classification: {
          top_match: 'Pinus merkusii (Sumatran Pine)',
          confidence: 0.93,
        },
      },
    };
  }

  const res = await fetchWithTimeout(`${API_BASE_URL}/jobs/${jobId}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Job ${jobId} not found on server.`);
    }
    const errorText = await res.text().catch(() => '');
    throw new Error(`Failed to fetch job status (HTTP ${res.status}): ${errorText || res.statusText}`);
  }

  return await res.json();
}
