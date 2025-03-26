import React, { useState, useEffect } from 'react';
import { Tabs, Table, Form, Input, Button, Select, Switch, message, Checkbox, InputNumber, DatePicker } from 'antd';
import axios from 'axios';


const { Option } = Select;
const { TextArea } = Input;

const LeaveSettingsTab = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [calculationMethods, setCalculationMethods] = useState([]);
  const [renewalPeriods, setRenewalPeriods] = useState([]);
  const [conditionTypes, setConditionTypes] = useState([]);
  const [comparisonOperators, setComparisonOperators] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [leaveTypeForm] = Form.useForm();
  const [leaveConditionForm] = Form.useForm();
  const [leavePolicyForm] = Form.useForm();
  const [conditionTypeForm] = Form.useForm(); // Form for condition types
  const [operatorForm] = Form.useForm(); // Yeni operatör formu
  const [renewalPeriodForm] = Form.useForm();
  const [tables, setTables] = useState([]); // Tabloları saklamak için state
  const [columns, setColumns] = useState([]); // Seçilen tabloya bağlı sütunlar
  const [selectedTable, setSelectedTable] = useState(null); // Seçili tablo



  

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  useEffect(() => {
    fetchLeaveTypes();
    fetchCalculationMethods();
    fetchRenewalPeriods();
    fetchConditionTypes();
    fetchComparisonOperators();
    fetchConditions();
    fetchPolicies();
    fetchSystemTables();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5001/api/leave-management/new-leave-types',
        getAuthHeader()
      );
      setLeaveTypes(response.data);
    } catch (error) {
      console.error('Error loading leave types:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      } else {
        message.error('İzin türleri yüklenemedi');
      }
    }
  };

  const fetchCalculationMethods = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5001/api/leave-management/new-leave-calculation-methods',
        getAuthHeader()
      );
      setCalculationMethods(response.data);
    } catch (error) {
      message.error('Failed to fetch calculation methods');
    }
  };

const fetchRenewalPeriods = async () => {
  try {
    const response = await axios.get(
      'http://localhost:5001/api/leave-management/renewal-periods',
      getAuthHeader()
    );
    setRenewalPeriods(response.data);
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Oturum süresi doldu, giriş sayfasına yönlendir
      window.location.href = '/login';
    } else {
      message.error('Yenileme periyotları yüklenemedi');
    }
  }
};

  

  const fetchConditionTypes = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5001/api/leave-management/new-leave-condition-types',
        getAuthHeader()
      );
      setConditionTypes(response.data);
    } catch (error) {
      console.error('Error loading condition types:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      } else {
        message.error('Koşul türleri yüklenemedi');
      }
    }
  };

  const fetchComparisonOperators = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/leave-management/new-comparison-operators', getAuthHeader());
      setComparisonOperators(response.data);
    } catch (error) {
      console.error('Error loading comparison operators:', error);
      message.error('Karşılaştırma operatörleri yüklenemedi');
    }
  };


  const fetchConditions = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5001/api/leave-management/new-leave-type-conditions',
        getAuthHeader()
      );
      setConditions(response.data);
    } catch (error) {
      console.error('Error loading conditions:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      } else {
        message.error('Koşullar yüklenemedi');
      }
    }
  };

  

  const fetchPolicies = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5001/api/leave-management/leave-policies',
        getAuthHeader()
      );
      setPolicies(response.data);
    } catch (error) {
      console.error('Error loading policies:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      } else {
        message.error('Politikalar yüklenemedi');
      }
    }
  };



   // Tablo verilerini çeker
   const fetchSystemTables = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/leave-management/system-tables', getAuthHeader());
      setTables(response.data);
    } catch (error) {
      message.error('Tablolar yüklenemedi');
    }
  };


  

  // Seçili tabloya bağlı sütun verilerini çeker
  const fetchSystemColumns = async (tableId) => {
    try {
      const response = await axios.get(`http://localhost:5001/api/leave-management/system-columns/${tableId}`, getAuthHeader());
      setColumns(response.data);
    } catch (error) {
      message.error('Sütunlar yüklenemedi');
    }
  };


  useEffect(() => {
    fetchSystemTables();
  }, []);
  


  const handleAddLeaveType = async (values) => {
    try {
      await axios.post(
        'http://localhost:5001/api/leave-management/new-leave-types',
        values,
        getAuthHeader()
      );
      message.success('İzin türü başarıyla eklendi');
      fetchLeaveTypes();
      leaveTypeForm.resetFields();
    } catch (error) {
      console.error('Error adding leave type:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      } else {
        message.error('İzin türü eklenemedi');
      }
    }
  };

  const handleAddCondition = async (values) => {
    try {
      console.log('Form values before submission:', values); // Debug için eklendi
      await axios.post(
        'http://localhost:5001/api/leave-management/new-leave-type-conditions',
        values,
        getAuthHeader()
      );
      message.success('Condition added successfully');
      fetchConditions();
      leaveConditionForm.resetFields();
    } catch (error) {
      console.error('Error adding condition:', error.response?.data); // Hata mesajını detaylı görmek için
      message.error('Failed to add condition');
    }
  };

  const handleAddPolicy = async (values) => {
    try {
      console.log("Gönderilen değerler:", values); // Gönderilen verileri kontrol edin
      await axios.post(
        'http://localhost:5001/api/leave-management/leave-policies',
        values,
        getAuthHeader()
      );
      message.success('Policy added successfully');
      fetchPolicies();
      leavePolicyForm.resetFields();
    } catch (error) {
      console.error('Failed to add policy:', error);
      if (error.response) {
        console.log('Sunucu hatası:', error.response.data); // Sunucudan dönen hatayı kontrol edin
      }
      message.error('Failed to add policy');
    }
  };
  


// Tablodan bir seçim yapıldığında, seçili tabloyu günceller ve sütunları çeker
const handleTableChange = (value) => {
  setSelectedTable(value); // Seçili tabloyu ayarla
  fetchSystemColumns(value); // Seçili tabloya ait sütunları getir
  conditionTypeForm.setFieldsValue({ column_name: null }); // Sütun alanını sıfırla
};

const handleAddConditionType = async (values) => {
  try {
    // Seçilen tablo ID'sini, tablo adına dönüştür
    const selectedTable = tables.find((table) => table.id === values.table_name);
    if (selectedTable) {
      values.table_name = selectedTable.table_name; // table_name alanını tablo adıyla değiştir
    }

    // Olası değerleri JSON formatına dönüştür
    if (values.possible_values && typeof values.possible_values === 'string' && values.possible_values.trim() !== '') {
      values.possible_values = JSON.stringify(values.possible_values.split(',').map(item => item.trim()));
    } else {
      values.possible_values = null; // Boşsa null olarak ayarla
    }

    await axios.post('http://localhost:5001/api/leave-management/new-leave-condition-types', values, getAuthHeader());
    message.success('Koşul türü başarıyla eklendi');
    fetchConditionTypes();
    conditionTypeForm.resetFields();
  } catch (error) {
    console.error('Koşul türü eklenirken hata oluştu:', error);
    message.error('Koşul türü eklenemedi');
  }
};

  

  const handleAddOperator = async (values) => {
    try {
      await axios.post('http://localhost:5001/api/leave-management/new-comparison-operators', values, getAuthHeader());
      message.success('Yeni operatör başarıyla eklendi');
      fetchComparisonOperators();
      operatorForm.resetFields();
    } catch (error) {
      message.error('Operatör eklenemedi');
    }
  };


  const handleAddRenewalPeriod = async (values) => {
    try {
      console.log('Sending data:', values); // Veriyi kontrol etmek için ekleyin
      await axios.post('http://localhost:5001/api/leave-management/renewal-periods', values, getAuthHeader());
      message.success('Yenileme periyodu başarıyla eklendi');
      fetchRenewalPeriods();
      renewalPeriodForm.resetFields();
    } catch (error) {
      console.error('Error adding renewal period:', error); // Hata mesajını konsola yazdırın
      message.error('Yenileme periyodu eklenemedi');
    }
  };
  


  const leaveTypesColumns = [
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Calculation Method',
      dataIndex: 'calculation_method_id',
      render: (methodId) => calculationMethods.find((m) => m.id === methodId)?.name || 'N/A',
    },
    {
      title: 'Renewal Period',
      dataIndex: 'renewal_period_id',
      render: (periodId) => renewalPeriods.find((p) => p.id === periodId)?.name || 'N/A',
    },
    { title: 'Is Paid', dataIndex: 'is_paid', render: (isPaid) => (isPaid ? 'Yes' : 'No') },
    {
      title: 'Event Based',
      dataIndex: 'is_event_based',
      render: (isEventBased) => (isEventBased ? 'Yes' : 'No'),
    },
    { title: 'Max Days', dataIndex: 'max_days', render: (maxDays) => maxDays || 'No limit' },
  ];

const conditionsColumns = [
    { title: 'Leave Type', dataIndex: 'leave_type_name', key: 'leave_type_name' },
    { title: 'Condition Type', dataIndex: 'condition_type_name', key: 'condition_type_name' },
    { title: 'Operator', dataIndex: 'operator_name', key: 'operator_name' },
    { title: 'Required Value', dataIndex: 'required_value', key: 'required_value' },
    { title: 'Error Message', dataIndex: 'error_message', key: 'error_message' },
  ];

  const policiesColumns = [
    { title: 'Leave Type', dataIndex: 'leave_type_name', key: 'leave_type_name' },
    { title: 'Years of Service', dataIndex: 'years_of_service', key: 'years_of_service' },
    { title: 'Days Entitled', dataIndex: 'days_entitled', key: 'days_entitled' },
    { title: 'Carry Forward Limit', dataIndex: 'carry_forward_limit', key: 'carry_forward_limit' },
  ];


  const conditionTypesColumns = [
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Table Name', dataIndex: 'table_name', key: 'table_name' },
    { title: 'Column Name', dataIndex: 'column_name', key: 'column_name' },
    { title: 'Data Type', dataIndex: 'data_type', key: 'data_type' },
    { title: 'Possible Values', dataIndex: 'possible_values', render: (values) => JSON.stringify(values) || '-' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Active', dataIndex: 'is_active', render: (isActive) => (isActive ? 'Yes' : 'No') },
  ];


  const operatorColumns = [
    { title: 'Kod', dataIndex: 'code', key: 'code' },
    { title: 'Ad', dataIndex: 'name', key: 'name' },
    { title: 'Sembol', dataIndex: 'symbol', key: 'symbol' },
    { title: 'Açıklama', dataIndex: 'description', key: 'description' }
  ];


  const renewalPeriodsColumns = [
    { title: 'Kod', dataIndex: 'code', key: 'code' },
    { title: 'Ad', dataIndex: 'name', key: 'name' },
    { title: 'Yenileme Ayı', dataIndex: 'renewal_month', key: 'renewal_month' },
    { title: 'Yenileme Günü', dataIndex: 'renewal_day', key: 'renewal_day' },
    { title: 'Yenileme Türü', dataIndex: 'renewal_type', key: 'renewal_type' },
    { title: 'Açıklama', dataIndex: 'description', key: 'description' },
  ];

  
  
  const LeaveTypeForm = () => (
    <Form form={leaveTypeForm} layout="vertical" onFinish={handleAddLeaveType}>
      <Form.Item name="code" label="Code" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="name" label="Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="calculation_method_id" label="Calculation Method" rules={[{ required: true }]}>
        <Select>
          {calculationMethods.map((method) => (
            <Option key={method.id} value={method.id}>
              {method.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="renewal_period_id" label="Renewal Period" rules={[{ required: true }]}>
        <Select>
          {renewalPeriods.map((period) => (
            <Option key={period.id} value={period.id}>
              {period.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="is_paid" label="Is Paid" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="is_event_based" label="Event Based" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="requires_approval" label="Requires Approval" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="max_days" label="Max Days">
        <InputNumber min={0} />
      </Form.Item>
      <Form.Item name="description" label="Description">
        <TextArea rows={4} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          Add Leave Type
        </Button>
      </Form.Item>
    </Form>
  );

  const LeaveConditionsForm = () => (
    <Form form={leaveConditionForm} layout="vertical" onFinish={handleAddCondition}>
    <Form.Item name="leave_type_id" label="Leave Type" rules={[{ required: true }]}>
      <Select>
        {leaveTypes.map((type) => (
          <Option key={type.id} value={type.id}>
            {type.name}
          </Option>
        ))}
      </Select>
    </Form.Item>
    <Form.Item name="condition_type_id" label="Condition Type" rules={[{ required: true }]}>
      <Select>
        {conditionTypes.map((type) => (
          <Option key={type.id} value={type.id}>
            {type.name}
          </Option>
        ))}
      </Select>
    </Form.Item>
    <Form.Item name="comparison_operator_id" label="Operator" rules={[{ required: true }]}>
      <Select>
        {comparisonOperators.map((operator) => (
          <Option key={operator.id} value={operator.id}>
            {operator.name} ({operator.symbol})
          </Option>
        ))}
      </Select>
    </Form.Item>
    <Form.Item name="required_value" label="Required Value" rules={[{ required: true }]}>
      <Input />
    </Form.Item>
    <Form.Item name="error_message" label="Error Message">
      <TextArea rows={2} />
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit">
        Add Condition
      </Button>
    </Form.Item>
  </Form>
  );

  const OperatorForm = () => (
    <Form form={operatorForm} layout="vertical" onFinish={handleAddOperator}>
      <Form.Item name="code" label="Kod" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="name" label="Ad" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="symbol" label="Sembol" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label="Açıklama">
        <TextArea rows={4} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          Operatör Ekle
        </Button>
      </Form.Item>
    </Form>
  );





  const RenewalPeriodForm = () => (
    <Form form={renewalPeriodForm} layout="vertical" onFinish={handleAddRenewalPeriod}>
      <Form.Item name="code" label="Code" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="name" label="Ad" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="renewal_type" label="Yenileme Türü" rules={[{ required: true }]}>
         <Input />
      </Form.Item>
      <Form.Item name="renewal_month" label="Yenileme Ayı" rules={[{ required: true }]}>
        <InputNumber min={1} max={12} placeholder="1-12 arası ay" />
      </Form.Item>
      <Form.Item name="renewal_day" label="Yenileme Günü" rules={[{ required: true }]}>
        <InputNumber min={1} max={31} placeholder="1-31 arası gün" />
      </Form.Item>
      <Form.Item name="description" label="Açıklama">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          Yenileme Periyodu Ekle
        </Button>
      </Form.Item>
    </Form>
  );
  

  const ConditionTypeForm = () => (
    <Form form={conditionTypeForm} layout="vertical" onFinish={handleAddConditionType}>
            <Form.Item name="code" label="Koşul Kodu" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="name" label="Koşul Türü Adı" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            {/* Tablo seçimi */}
            <Form.Item name="table_name" label="Tablo Adı" rules={[{ required: true }]}>
              <Select onChange={handleTableChange} placeholder="Tablo seçin">
                {tables.map((table) => (
                  <Option key={table.id} value={table.id}>
                    {table.display_name || table.table_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            {/* Seçili tabloya göre sütun seçimi */}
            <Form.Item name="column_name" label="Sütun Adı" rules={[{ required: true }]}>
              <Select placeholder="Sütun seçin">
                {columns.map((column) => (
                  <Option key={column.id} value={column.column_name}>
                    {column.display_name || column.column_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="data_type" label="Veri Tipi" rules={[{ required: true }]}>
              <Select>
                <Option value="STRING">String</Option>
                <Option value="NUMBER">Number</Option>
                <Option value="DATE">Date</Option>
                <Option value="BOOLEAN">Boolean</Option>
              </Select>
            </Form.Item>
            <Form.Item name="possible_values" label="Olası Değerler (Virgülle ayırın)">
              <Input.TextArea placeholder="Örneğin: MALE, FEMALE" />
            </Form.Item>
            <Form.Item name="description" label="Açıklama">
              <TextArea rows={4} />
            </Form.Item>
            <Form.Item name="is_active" valuePropName="checked">
              <Checkbox>Aktif mi?</Checkbox>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Koşul Türü Ekle
              </Button>
            </Form.Item>
          </Form>
  );

  const LeavePolicyForm = () => (
    <Form form={leavePolicyForm} layout="vertical" onFinish={handleAddPolicy}>
      <Form.Item name="leave_type_id" label="İzin Türü" rules={[{ required: true }]}>
        <Select>
          {leaveTypes.map((type) => (
            <Option key={type.id} value={type.id}>{type.name}</Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="years_of_service" label="Kıdem Yılı" rules={[{ required: true }]}>
        <InputNumber min={0} />
      </Form.Item>
      <Form.Item name="days_entitled" label="Hak Edilen Gün" rules={[{ required: true }]}>
        <InputNumber min={1} />
      </Form.Item>
      <Form.Item name="is_carried_forward" label="Devir Edilebilir" valuePropName="checked">
        <Checkbox />
      </Form.Item>
      <Form.Item name="max_carryover_days" label="Maksimum Devir Gün Sayısı">
        <InputNumber min={0} placeholder="Devir günü limiti" />
      </Form.Item>
      <Form.Item name="effective_from" label="Geçerli Başlangıç Tarihi" rules={[{ required: true }]}>
        <DatePicker />
      </Form.Item>
      <Form.Item name="effective_to" label="Geçerli Bitiş Tarihi">
        <DatePicker />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">Politika Ekle</Button>
      </Form.Item>
    </Form>
  );
  
  

  const items = [
    {
      key: '1',
      label: 'Leave Types',
      children: (
        <>
          <LeaveTypeForm />
          <Table columns={leaveTypesColumns} dataSource={leaveTypes} rowKey="id" />
        </>
      ),
    },
    {
      key: '2',
      label: 'Leave Conditions',
      children: (
        <>
          <LeaveConditionsForm />
          <Table columns={conditionsColumns} dataSource={conditions} rowKey="id" />
        </>
      ),
    },
    {
      key: '3',
      label: 'İzin Politikaları',
      children: (
        <>
          <LeavePolicyForm />
          <Table columns={policiesColumns} dataSource={policies} rowKey="id" />
        </>
      ),
    },    
    {
      key: '4',
      label: 'Koşul Türleri',
      children: (
        <>
          {/* Formu doğrudan ekleyin */}
          <ConditionTypeForm />
          {/* Tabloyu normal bir tablo bileşeni olarak ekleyin */}
          <Table columns={conditionTypesColumns} dataSource={conditionTypes} rowKey="id" />
        </>
      ),
    },    

    {
      key: '5',
      label: 'Comparison Operators', // Yeni Operatör Tabı
      children: (
        <>
          <OperatorForm />
          <Table columns={operatorColumns} dataSource={comparisonOperators} rowKey="id" />
        </>
      ),
    },
    {
      key: '6',
      label: 'Yenileme Periyotları',
      children: (
        <>
          <RenewalPeriodForm />
          <Table columns={renewalPeriodsColumns} dataSource={renewalPeriods} rowKey="id" />
        </>
      ),
    },
  ];
  

  return <Tabs items={items} />;
};

export default LeaveSettingsTab;
