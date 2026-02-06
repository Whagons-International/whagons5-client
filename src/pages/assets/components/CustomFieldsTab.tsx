import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/providers/LanguageProvider';
import type { AssetCustomField, AssetCustomFieldValue } from '@/store/types';

interface CustomFieldsTabProps {
    fields: AssetCustomField[];
    values: AssetCustomFieldValue[];
}

const formatValue = (cfv: AssetCustomFieldValue): string => {
    switch (cfv.type) {
        case 'CHECKBOX':
            return cfv.value === '1' || cfv.value === 'true' ? 'Yes' : 'No';
        case 'DATE':
            return cfv.value_date ? new Date(cfv.value_date).toLocaleDateString() : cfv.value || '-';
        case 'TIME':
            return cfv.value || '-';
        case 'DATETIME':
            return cfv.value_date ? new Date(cfv.value_date).toLocaleString() : cfv.value || '-';
        case 'NUMBER':
            return cfv.value_numeric != null ? String(cfv.value_numeric) : cfv.value || '-';
        case 'MULTI_SELECT':
        case 'LIST':
            if (cfv.value_json && Array.isArray(cfv.value_json)) {
                return cfv.value_json.join(', ');
            }
            return cfv.value || '-';
        default:
            return cfv.value || '-';
    }
};

export const CustomFieldsTab = ({ fields, values }: CustomFieldsTabProps) => {
    const { t } = useLanguage();

    if (fields.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('assets.customFields.noFields', 'No custom fields defined for this asset type.')}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {t('assets.customFields.title', 'Custom Fields')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {sortedFields.map((field) => {
                        const cfv = values.find((v) => v.field_id === field.id);
                        const displayValue = cfv ? formatValue(cfv) : (field.default_value || '-');

                        return (
                            <div key={field.id} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{field.name}</span>
                                    {field.is_required && (
                                        <Badge variant="outline" className="text-xs">
                                            {t('assets.customFields.required', 'Required')}
                                        </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-xs">
                                        {field.field_type}
                                    </Badge>
                                </div>
                                <span className="text-sm text-muted-foreground text-right max-w-[50%] truncate">
                                    {displayValue}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
