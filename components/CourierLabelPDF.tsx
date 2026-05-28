'use client';

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

 const labels = [
    {
      from: {
        name: "B.K Arogyam Healthcare Pvt Ltd",
        address: "Manduvadih Lahartara Road, Shivdaspur",
        city: "Varanasi",
        state: "UP",
        country: "221001",
        mobile: "9369100979",
      },
    },
]
// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  labelBorder: {
    border: '2px solid #000',
    borderRadius: '10px',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop:'8px',
    marginBottom:'5px',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  borderLine: {
    fontSize: 16,
    marginVertical: 2,    // reduce vertical spacing
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subTitle: {
    fontSize: 14,
  },
  textBlock: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  sectionWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,   // slightly tighter spacing
  },
  section: {
    width: '46%',
    margin: 6,
  },
  labelTitle: {
    fontWeight: 'bold',
    marginBottom: 1,
  },
  text: {
    marginBottom: 2,
  },
  verticalLine: {
    borderLeftWidth: 1.5,
    borderColor: '#000',
    marginVertical: 1,
  },
});

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};


const CourierLabelPDF = ({ data }: Props) => (
  <Document>
    <Page size="A5" style={styles.page}>
      <View style={styles.labelBorder}>
        {/* Header */}
        <View style={styles.header}>
          <Image src="/logo.jpg" style={styles.logo} />
          <View style={styles.textBlock}>
            <Text style={styles.title}>B.K Arogyam</Text>
            <Text style={styles.subTitle}>Healthcare Private Limited</Text>
          </View>
        </View>
        <View style={{ borderBottomWidth: 1, borderColor: '#000', marginHorizontal: 10 }} />

        {/* TO and FROM Sections with vertical line */}
        <View style={styles.sectionWrapper}>
          {/* TO Section */}
          <View style={styles.section}>
            <Text style={styles.labelTitle}>Order Number : - #{data.id}</Text>
            <Text style={styles.labelTitle}></Text>
            <Text style={styles.labelTitle}>TO:</Text>
            <Text style={styles.labelTitle}>{data.customer_name}</Text>
            <Text style={styles.text}>Address: {data.delivery_address}</Text>
            <Text style={styles.text}>City: {data.delivery_city}</Text>
            <Text style={styles.text}>State: {data.delivery_state}</Text>
            <Text style={styles.text}>Pincode: {data.delivery_pincode}</Text>
            <Text style={styles.text}>Mobile: {data.customer_phone}</Text>
          </View>

          {/* Vertical Line */}
          <View style={styles.verticalLine} />

          {/* FROM Section */}
          <View style={styles.section}>
            <Text style={styles.labelTitle}>FROM:</Text>
            <Text style={styles.labelTitle}>
            {labels[0].from.name}
            </Text>

            <Text style={styles.text}>
            {labels[0].from.address}
            </Text>

            <Text style={styles.text}>
            {labels[0].from.city}, {labels[0].from.state},{" "}
            {labels[0].from.country}
            </Text>

            <Text style={styles.text}>
            Mob: {labels[0].from.mobile}
            </Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);

export default CourierLabelPDF;
