export type ScanStackParamList = {
  ScanCapture: undefined;
  ScanMarking: { treeCode?: string; removeBackground: boolean };
  ScanProcessing: { treeCode: string };
  ScanResult: { treeCode: string };
  CertificateViewer: { treeCode: string };
};

export type GalleryStackParamList = {
  GalleryList: undefined;
  ScanResult: { treeCode: string };
  CertificateViewer: { treeCode: string };
  PlotDetail: { plotCode: string };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  PlotDetail: { plotCode: string };
  CreatePlot: undefined;
  ScanResult: { treeCode: string };
  CertificateViewer: { treeCode: string };
};

export type PlotsStackParamList = DashboardStackParamList;
