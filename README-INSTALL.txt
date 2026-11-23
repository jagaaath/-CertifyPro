CERTIFYPRO AUTOMATIC QR VERIFICATION PATCH

1) BACK UP your DBMS project folder (or use the timestamped backups made by the patch script).
2) Extract this ZIP directly into the DBMS-main project root, the folder containing backend and frontend.
3) Open PowerShell in that DBMS-main folder.
4) Run:
     node apply-qr-patch.js
5) The script creates the new backend files and patches the existing certificate route, Certificate model and student upload page.
6) Seed the local development trusted record:
     cd backend
     node utils/seedTrustedCertificate.js
7) Ensure backend/.env has valid Cloudinary credentials as well as MONGO_URI and JWT_SECRET. The QR scan runs before Cloudinary; valid credentials are needed only after a readable QR is found.
8) Restart backend and frontend. Upload the supplied PDFs from the project root's test-files folder.

TEST CASES:
- sample_verified_certificate.pdf: its QR URL is pre-registered by seedTrustedCertificate.js; expect VERIFIED.
- sample_not_registered_certificate.pdf: readable URL absent from database; expect NOT VERIFIED.
- sample_no_qr_certificate.pdf: no QR; expect "Picture not clear, upload again." and no certificate upload.

IMPORTANT:
- Do not run seed:all against your professor's future database. The demo record is for your own development database only.
- QR matching is an exact normalised URL lookup, not an internet visit to the URL.
- QR verification and faculty approval are separate. Faculty approval status remains pending until faculty review.
