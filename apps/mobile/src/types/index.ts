export interface Scan {
  id: string;
  created_at: string;
  dbh: number;
  height: number;
  biomass: number;
  co2e: number;
  species_classification?: {
    top_match: string;
    confidence: number;
  };
  image_url?: string;
}

export interface UploadResponse {
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
}

export interface JobResult {
  status: 'processing' | 'completed' | 'failed';
  result?: Scan;
  error?: string;
}
