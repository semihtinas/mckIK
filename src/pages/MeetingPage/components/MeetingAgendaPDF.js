import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import { Button } from 'antd';
import { FileOutlined, DownloadOutlined } from '@ant-design/icons';
import moment from 'moment';

// Roboto fontunu import ediyoruz (Türkçe karakterleri destekler)
Font.register({
    family: 'Roboto',
    fonts: [
        {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
            fontWeight: 'normal',
        },
        {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
            fontWeight: 'bold',
        },
    ],
});

// Stilleri tanımla
const styles = StyleSheet.create({
    page: {
        padding: 30,
        backgroundColor: '#ffffff',
        fontFamily: 'Roboto',
    },
    header: {
        marginBottom: 20,
        padding: 10,
        borderBottom: 1,
        borderColor: '#112233',
        fontFamily: 'Roboto',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#112233',
        marginBottom: 10,
        fontFamily: 'Roboto',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        fontFamily: 'Roboto',
    },
    meetingInfo: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#f8f9fa',
        fontFamily: 'Roboto',
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 5,
        fontFamily: 'Roboto',
    },
    infoLabel: {
        width: 100,
        fontWeight: 'bold',
        fontFamily: 'Roboto',
    },
    infoValue: {
        flex: 1,
        fontFamily: 'Roboto',
    },
    agendaSection: {
        marginTop: 30,
        fontFamily: 'Roboto',
    },
    agendaItem: {
        marginBottom: 15,
        padding: 10,
        fontFamily: 'Roboto',
    },
    agendaItemContent: {
        fontSize: 12,
        marginTop: 5,
        fontFamily: 'Roboto',
    },
    agendaItemDescription: {
        fontSize: 10,
        marginTop: 5,
        color: '#666',
        fontFamily: 'Roboto',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 10,
        fontFamily: 'Roboto',
    }
});

// PDF Döküman Bileşeni
export const MeetingAgendaPDF = ({ meeting, agendaItems }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={styles.header}>
                <Text style={styles.title}>{meeting.title}</Text>
                <Text style={styles.subtitle}>Toplantı Gündemi</Text>
            </View>

            <View style={styles.meetingInfo}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tarih:</Text>
                    <Text style={styles.infoValue}>
                        {moment(meeting.start_time).format('DD.MM.YYYY')}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Saat:</Text>
                    <Text style={styles.infoValue}>
                        {moment(meeting.start_time).format('HH:mm')} - 
                        {moment(meeting.end_time).format('HH:mm')}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Konum:</Text>
                    <Text style={styles.infoValue}>{meeting.location || 'Belirtilmedi'}</Text>
                </View>
            </View>

            <View style={styles.agendaSection}>
                <Text style={styles.title}>Gündem Maddeleri</Text>
                {agendaItems.map((item, index) => (
                    <View key={item.id} style={styles.agendaItem}>
                        <Text style={styles.agendaItemContent}>
                            {index + 1}. {item.agenda_item} ({item.duration_minutes} dk)
                        </Text>
                        {item.description && (
                            <Text style={styles.agendaItemDescription}>
                                {item.description}
                            </Text>
                        )}
                    </View>
                ))}
            </View>

            <View style={styles.footer}>
                <Text>
                    Oluşturulma Tarihi: {moment().format('DD.MM.YYYY HH:mm')}
                </Text>
            </View>
        </Page>
    </Document>
);

// Download fonksiyonu
export const downloadPDF = async (meeting, agendaItems) => {
    const blob = await pdf(<MeetingAgendaPDF meeting={meeting} agendaItems={agendaItems} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `toplanti-gundemi-${moment(meeting.start_time).format('YYYY-MM-DD')}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
};

// İndirme butonu bileşeni
export const DownloadAgendaPDFButton = ({ meeting, agendaItems }) => (
    <Button 
        type="primary" 
        icon={<FileOutlined />} 
        onClick={() => downloadPDF(meeting, agendaItems)}
    >
        Gündemi İndir
    </Button>
);

export default MeetingAgendaPDF;