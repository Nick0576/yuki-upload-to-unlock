export function canUploadYukiFile(isAdultConfirmed: boolean, isSignedIn: boolean): boolean {
  return isAdultConfirmed && isSignedIn;
}

export function canUnlockYukiDownload(
  isAdultConfirmed: boolean,
  isSignedIn: boolean,
  hasUploadedFile: boolean,
): boolean {
  return canUploadYukiFile(isAdultConfirmed, isSignedIn) && hasUploadedFile;
}
