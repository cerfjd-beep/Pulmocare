GRANT SELECT, INSERT, UPDATE ON public.profiles TO pulmocare_executor;
CREATE POLICY executor ON public.profiles TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.role_assignments TO pulmocare_executor;
CREATE POLICY executor ON public.role_assignments TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.patients TO pulmocare_executor;
CREATE POLICY executor ON public.patients TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.caregiver_links TO pulmocare_executor;
CREATE POLICY executor ON public.caregiver_links TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.consents TO pulmocare_executor;
CREATE POLICY executor ON public.consents TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.addresses TO pulmocare_executor;
CREATE POLICY executor ON public.addresses TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.services TO pulmocare_executor;
CREATE POLICY executor ON public.services TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.service_price_versions TO pulmocare_executor;
CREATE POLICY executor ON public.service_price_versions TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.competencies TO pulmocare_executor;
CREATE POLICY executor ON public.competencies TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.professionals TO pulmocare_executor;
CREATE POLICY executor ON public.professionals TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.documents TO pulmocare_executor;
CREATE POLICY executor ON public.documents TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.service_requirements TO pulmocare_executor;
CREATE POLICY executor ON public.service_requirements TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.professional_credentials TO pulmocare_executor;
CREATE POLICY executor ON public.professional_credentials TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.professional_availability TO pulmocare_executor;
CREATE POLICY executor ON public.professional_availability TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.service_requests TO pulmocare_executor;
CREATE POLICY executor ON public.service_requests TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.clinical_protocol_versions TO pulmocare_executor;
CREATE POLICY executor ON public.clinical_protocol_versions TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.clinical_intakes TO pulmocare_executor;
CREATE POLICY executor ON public.clinical_intakes TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.request_assignments TO pulmocare_executor;
CREATE POLICY executor ON public.request_assignments TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.assessments TO pulmocare_executor;
CREATE POLICY executor ON public.assessments TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.prescriptions TO pulmocare_executor;
CREATE POLICY executor ON public.prescriptions TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.travel_tariff_versions TO pulmocare_executor;
CREATE POLICY executor ON public.travel_tariff_versions TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.quotes TO pulmocare_executor;
CREATE POLICY executor ON public.quotes TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.quote_items TO pulmocare_executor;
CREATE POLICY executor ON public.quote_items TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.travel_estimates TO pulmocare_executor;
CREATE POLICY executor ON public.travel_estimates TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.appointments TO pulmocare_executor;
CREATE POLICY executor ON public.appointments TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.clinical_encounters TO pulmocare_executor;
CREATE POLICY executor ON public.clinical_encounters TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.vital_signs TO pulmocare_executor;
CREATE POLICY executor ON public.vital_signs TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.clinical_amendments TO pulmocare_executor;
CREATE POLICY executor ON public.clinical_amendments TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.clinical_releases TO pulmocare_executor;
CREATE POLICY executor ON public.clinical_releases TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.follow_ups TO pulmocare_executor;
CREATE POLICY executor ON public.follow_ups TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.companies TO pulmocare_executor;
CREATE POLICY executor ON public.companies TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.company_contacts TO pulmocare_executor;
CREATE POLICY executor ON public.company_contacts TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.business_quotes TO pulmocare_executor;
CREATE POLICY executor ON public.business_quotes TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.sales TO pulmocare_executor;
CREATE POLICY executor ON public.sales TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.payment_attempts TO pulmocare_executor;
CREATE POLICY executor ON public.payment_attempts TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.payments TO pulmocare_executor;
CREATE POLICY executor ON public.payments TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.payment_events TO pulmocare_executor;
CREATE POLICY executor ON public.payment_events TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.refunds TO pulmocare_executor;
CREATE POLICY executor ON public.refunds TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.fiscal_documents TO pulmocare_executor;
CREATE POLICY executor ON public.fiscal_documents TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.outbox_jobs TO pulmocare_executor;
CREATE POLICY executor ON public.outbox_jobs TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.notifications TO pulmocare_executor;
CREATE POLICY executor ON public.notifications TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.audit_events TO pulmocare_executor;
CREATE POLICY executor ON public.audit_events TO pulmocare_executor
USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.follow_up_responses TO pulmocare_executor;
CREATE POLICY executor ON public.follow_up_responses TO pulmocare_executor
USING (true) WITH CHECK (true);
