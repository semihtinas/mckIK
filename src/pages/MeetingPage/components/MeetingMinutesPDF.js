import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
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

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
    fontFamily: 'Roboto', // Font tanımlaması
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderColor: '#112233',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Roboto', // Font tanımlaması
  },
  subTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'Roboto', // Font tanımlaması
  },
  meetingInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 120,
    fontWeight: 'bold',
    fontFamily: 'Roboto', // Font tanımlaması
  },
  value: {
    flex: 1,
    fontFamily: 'Roboto', // Font tanımlaması
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    padding: 5,
    marginBottom: 8,
    fontFamily: 'Roboto', // Font tanımlaması
  },
  content: {
    fontSize: 11,
    lineHeight: 1.5,
    fontFamily: 'Roboto', // Font tanımlaması
  },
  participantSection: {
    marginTop: 15,
    border: 1,
    borderColor: '#eee',
    padding: 10,
  },
  participantStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  actionItem: {
    marginBottom: 8,
    padding: 5,
    border: 1,
    borderColor: '#eee',
  },
  signatures: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
    borderTop: 1,
    borderColor: '#000',
    paddingTop: 5,
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
    textAlign: 'center',
    borderTop: 1,
    borderColor: '#eee',
    paddingTop: 10,
    fontFamily: 'Roboto', // Font tanımlaması
  }
});

const MeetingMinutesDocument = ({ meeting, minutes, participants }) => (
  <Document>
    {minutes.map((minute, index) => (
      <Page key={`minute-${index}`} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Toplantı Tutanağı</Text>
          <Text style={styles.subTitle}>Toplantı: {meeting.title}</Text>
        </View>

        <View style={styles.meetingInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Tarih:</Text>
            <Text style={styles.value}>
              {moment(meeting.start_time).format('DD.MM.YYYY HH:mm')} - 
              {moment(meeting.end_time).format('HH:mm')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Yer:</Text>
            <Text style={styles.value}>{meeting.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Toplantı Türü:</Text>
            <Text style={styles.value}>
              {meeting.meeting_type === 'regular' ? 'Rutin Toplantı' :
               meeting.meeting_type === 'emergency' ? 'Acil Toplantı' :
               meeting.meeting_type === 'board' ? 'Yönetim Toplantısı' : 'Diğer'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gündem Maddesi</Text>
          <Text style={styles.content}>{minute.agenda_item}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alınan Kararlar</Text>
          <Text style={styles.content}>{minute.content}</Text>
        </View>

        {minute.action_items && minute.action_items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yapılacak İşler</Text>
            {minute.action_items.map((item, idx) => (
              <View key={idx} style={styles.actionItem}>
                <Text style={styles.content}>
                  {idx + 1}. {item.description}
                </Text>
                <Text style={styles.content}>
                  Sorumlu: {item.assigned_to_name}
                </Text>
                <Text style={styles.content}>
                  Tarih: {moment(item.due_date).format('DD.MM.YYYY')}
                </Text>
                <Text style={styles.content}>
                  Öncelik: {
                    item.priority === 'high' ? 'Yüksek' :
                    item.priority === 'medium' ? 'Orta' :
                    'Düşük'
                  }
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.participantSection}>
          <Text style={styles.sectionTitle}>Katılımcı Durumları</Text>
          {participants.map((participant, idx) => (
            <View key={idx} style={styles.participantStatus}>
              <Text style={styles.content}>{participant.name}</Text>
              <Text style={styles.content}>
                {participant.attendance_status === 'accepted' ? 'Katıldı' :
                 participant.attendance_status === 'declined' ? 'Katılmadı' :
                 'Yanıt Vermedi'}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.signatures}>
          <View style={styles.signatureBox}>
            <Text>Tutanağı Hazırlayan</Text>
            <Text style={styles.content}>{minute.creator_name}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>Toplantı Başkanı</Text>
            <Text style={styles.content}>{meeting.organizer_name}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Bu tutanak {moment().format('DD.MM.YYYY HH:mm')} tarihinde oluşturulmuştur.
        </Text>
      </Page>
    ))}
  </Document>
);
export default MeetingMinutesDocument;