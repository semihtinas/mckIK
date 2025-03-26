// PermissionWrapper.js
import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Spin } from 'antd';

const PermissionWrapper = React.memo(({
  children,
  permissions = [],
  requiredPermission,
  ownPermission,
  userInfo,
  isPermissionsLoaded
}) => {
  const { id: paramId } = useParams();
  
  const accessCheck = useMemo(() => {
    if (!isPermissionsLoaded || !Array.isArray(permissions)) {
      return { isChecking: true, hasAccess: false };
    }

    const hasRequiredPermission = permissions.includes(requiredPermission);
    const hasOwnPermission = ownPermission && permissions.includes(ownPermission);
    const isAccessingOwnPage = paramId && userInfo && String(paramId) === String(userInfo.id);
    const hasAccess = hasRequiredPermission || (hasOwnPermission && isAccessingOwnPage);

    return { isChecking: false, hasAccess };
  }, [permissions, requiredPermission, ownPermission, userInfo, paramId, isPermissionsLoaded]);

  if (accessCheck.isChecking) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!accessCheck.hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
});

export default PermissionWrapper;