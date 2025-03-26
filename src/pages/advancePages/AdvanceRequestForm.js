// components/AdvanceRequestForm.js
import React from 'react';
import { Form, InputNumber, Input, Button, message } from 'antd';
import axios from 'axios';

const AdvanceRequestForm = ({ closeModal, onSuccess }) => {
    const [form] = Form.useForm();

    const handleSubmit = async (values) => {
        try {
            await axios.post('http://localhost:5001/api/advance-requests', values, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            message.success('Avans talebi başarıyla oluşturuldu');
            form.resetFields();
            closeModal();
            if (onSuccess) onSuccess();
        } catch (error) {
            message.error('Avans talebi oluşturulurken bir hata oluştu');
        }
    };

    return (
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
                name="amount"
                label="Talep Edilen Tutar"
                rules={[{ required: true, message: 'Lütfen tutar giriniz' }]}
            >
                <InputNumber
                    style={{ width: '100%' }}
                    formatter={value => `₺ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/₺\s?|(,*)/g, '')}
                    min={0}
                />
            </Form.Item>

            <Form.Item
                name="reason"
                label="Talep Nedeni"
                rules={[{ required: true, message: 'Lütfen talep nedeninizi belirtiniz' }]}
            >
                <Input.TextArea rows={4} />
            </Form.Item>

            <Form.Item>
                <Button type="primary" htmlType="submit">
                    Talep Gönder
                </Button>
            </Form.Item>
        </Form>
    );
};

export default AdvanceRequestForm;