export declare class CustomerDocumentInputDto {
    type: string;
    fileUrl: string;
    originalName: string;
    mimeType: string;
}
export declare class CreateApplicationDto {
    businessName: string;
    legalName: string;
    rut: string;
    contactName?: string;
    phone?: string;
    email: string;
    password: string;
    address?: string;
    department?: string;
    city?: string;
    businessType?: string;
    requestedMedicationPermission?: boolean;
    documents?: CustomerDocumentInputDto[];
}
