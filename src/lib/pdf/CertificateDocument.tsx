import "server-only";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#475569", marginBottom: 28 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  details: { flexGrow: 1, paddingRight: 24 },
  label: { fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 13, marginBottom: 14 },
  qr: { width: 130, height: 130 },
  footer: { marginTop: 40, fontSize: 9, color: "#94a3b8", lineHeight: 1.4 },
});

export function CertificateDocument({
  estateName,
  tenantName,
  houseNumber,
  livingSpaceTypeName,
  year,
  amountLabel,
  certificateNumber,
  issuedAtLabel,
  qrDataUrl,
}: {
  estateName: string;
  tenantName: string;
  houseNumber: string;
  livingSpaceTypeName: string;
  year: number;
  amountLabel: string;
  certificateNumber: string;
  issuedAtLabel: string;
  qrDataUrl: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{estateName}</Text>
        <Text style={styles.subtitle}>Certificate of Estate Dues Clearance — {year}</Text>

        <View style={styles.row}>
          <View style={styles.details}>
            <Text style={styles.label}>Tenant</Text>
            <Text style={styles.value}>{tenantName}</Text>
            <Text style={styles.label}>House</Text>
            <Text style={styles.value}>
              {houseNumber} · {livingSpaceTypeName}
            </Text>
            <Text style={styles.label}>Amount cleared</Text>
            <Text style={styles.value}>{amountLabel}</Text>
            <Text style={styles.label}>Certificate number</Text>
            <Text style={styles.value}>{certificateNumber}</Text>
            <Text style={styles.label}>Issued</Text>
            <Text style={styles.value}>{issuedAtLabel}</Text>
          </View>
          <Image src={qrDataUrl} style={styles.qr} />
        </View>

        <Text style={styles.footer}>
          This certificate confirms the {year} estate due for the tenant and house named above has
          been paid and validated. Scan the QR code, or present this certificate, for gate
          verification.
        </Text>
      </Page>
    </Document>
  );
}
