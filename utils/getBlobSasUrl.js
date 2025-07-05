const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol
} = require('@azure/storage-blob');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;

// containerName: e.g., 'profileimages' or 'applogos'
// blobName: fileName as uploaded
// expiresInMinutes: link expiry (default 60)
const getBlobSasUrl = async (containerName, blobName, expiresInMinutes = 60) => {
  // Credentials required for signing
  const sharedKeyCredential = new StorageSharedKeyCredential(
    AZURE_STORAGE_ACCOUNT_NAME,
    AZURE_STORAGE_ACCOUNT_KEY
  );

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  // Calculate expiry time
  const expiresOn = new Date(new Date().valueOf() + expiresInMinutes * 60 * 1000);

  // SAS Query
  const sasToken = generateBlobSASQueryParameters({
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse("r"),
    startsOn: new Date(),
    expiresOn,
    protocol: SASProtocol.Https,
  }, sharedKeyCredential).toString();

  return `${blobClient.url}?${sasToken}`;
};

module.exports = getBlobSasUrl;
