/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        // --- 1. Independent Tables ---
        .createTable('participantinfo', function (table) {
            table.increments('participantid').primary();
            table.string('participantemail', 150);
            table.string('participantfirstname', 50);
            table.string('participantlastname', 50);
            table.date('participantdob');
            table.string('participantrole', 20);
            table.string('participantphone', 20);
            table.string('participantcity', 80);
            table.string('participantstate', 2);
            table.string('participantzip', 10);
            table.string('participantschooloremployer', 100);
            table.string('participantfieldofinterest', 50);
        })
        .createTable('eventtypes', function (table) {
            table.string('eventname', 50).primary();
            table.string('eventtype', 50);
            table.string('eventdescription', 300);
            // Keeping original SQL spelling to ensure match with existing DB
            table.string('eventrecourrancepatter', 50);
            table.integer('eventdefaultcapacity');
        })

        // --- 2. Tables with Foreign Keys ---
        .createTable('participantdonations', function (table) {
            table.increments('donationid').primary();
            table.integer('participantid').references('participantid').inTable('participantinfo');
            table.integer('donationno');
            table.date('donationdate');
            table.decimal('donationamount', 10, 2);
        })
        .createTable('participantmilestones', function (table) {
            table.increments('participantmilestoneid').primary();
            table.integer('participantid').references('participantid').inTable('participantinfo');
            table.integer('milestoneno');
            table.string('milestonetitle', 100);
            table.date('milestonedate');
        })
        .createTable('eventinstances', function (table) {
            table.increments('instanceid').primary();
            table.string('eventname', 50).references('eventname').inTable('eventtypes');
            table.timestamp('eventdatetimestart');
            table.timestamp('eventdatetimeend');
            table.string('eventlocation', 100);
            table.integer('eventcapacity');
            table.timestamp('eventregistrationdeadline');
        })

        // --- 3. Deeply Nested Dependencies ---
        .createTable('participantattendanceinstances', function (table) {
            table.increments('attendanceinstanceid').primary();
            table.integer('participantid').references('participantid').inTable('participantinfo');
            table.integer('instanceid').references('instanceid').inTable('eventinstances');
            table.timestamp('eventdatetimestart');
            table.string('registrationstatus', 20);
            table.boolean('registrationattendedflag');
            table.timestamp('registrationcheckintime');
            table.timestamp('registrationcreateddate');
        })
        .createTable('surveyinstances', function (table) {
            table.integer('attendanceinstanceid').primary().references('attendanceinstanceid').inTable('participantattendanceinstances');
            table.decimal('surveysatisfactionscore', 3, 1);
            table.decimal('surveyusefulnesscore', 3, 1);
            table.decimal('surveyinstructorscore', 3, 1);
            table.decimal('surveyrecommendationscore', 3, 1);
            table.decimal('surveyoverallscore', 3, 1);
            table.string('surveynpsbucket', 20);
            table.string('surveycomments', 3000);
            table.timestamp('surveysubmissiondate');

            // Add the check constraint from your SQL
            table.check("surveynpsbucket in ('Passive', 'Promoter', 'Detractor')");
        })

        // --- 4. Staging & Audit Tables ---
        .createTable('stagingrawsurvey', function (table) {
            table.increments('rowid').primary();
            table.text('participantemail');
            table.text('participantfirstname');
            table.text('participantlastname');
            table.text('participantdob');
            table.text('participantrole');
            table.text('participantphone');
            table.text('participantcity');
            table.text('participantstate');
            table.text('participantzip');
            table.text('participantschooloremployer');
            table.text('participantfieldofinterest');
            table.text('eventname');
            table.text('eventtype');
            table.text('eventdescription');
            table.text('eventrecurrencepattern');
            table.text('eventdefaultcapacity');
            table.text('eventdatetimestart');
            table.text('eventdatetimeend');
            table.text('eventlocation');
            table.text('eventcapacity');
            table.text('eventregistrationdeadline');
            table.text('registrationstatus');
            table.text('registrationattendedflag');
            table.text('registrationcheckintime');
            table.text('registrationcreatedat');
            table.text('surveysatisfactionscore');
            table.text('surveyusefulnesscore');
            table.text('surveyinstructorscore');
            table.text('surveyrecommendationscore');
            table.text('surveyoverallscore');
            table.text('surveynpsbucket');
            table.text('surveycomments');
            table.text('surveysubmissiondate');
            table.text('milestonetitles');
            table.text('milestonedates');
            table.text('donationhistory');
            table.text('totaldonations');
        })
        .createTable('stagingarchive', function (table) {
            table.increments('archiveid').primary();
            table.timestamp('archivedat').notNullable().defaultTo(knex.fn.now());

            table.text('participantemail');
            table.text('participantfirstname');
            table.text('participantlastname');
            table.text('participantdob');
            table.text('participantrole');
            table.text('participantphone');
            table.text('participantcity');
            table.text('participantstate');
            table.text('participantzip');
            table.text('participantschooloremployer');
            table.text('participantfieldofinterest');
            table.text('eventname');
            table.text('eventtype');
            table.text('eventdescription');
            table.text('eventrecurrencepattern');
            table.text('eventdefaultcapacity');
            table.text('eventdatetimestart');
            table.text('eventdatetimeend');
            table.text('eventlocation');
            table.text('eventcapacity');
            table.text('eventregistrationdeadline');
            table.text('registrationstatus');
            table.text('registrationattendedflag');
            table.text('registrationcheckintime');
            table.text('registrationcreatedat');
            table.text('surveysatisfactionscore');
            table.text('surveyusefulnesscore');
            table.text('surveyinstructorscore');
            table.text('surveyrecommendationscore');
            table.text('surveyoverallscore');
            table.text('surveynpsbucket');
            table.text('surveycomments');
            table.text('surveysubmissiondate');
            table.text('milestonetitles');
            table.text('milestonedates');
            table.text('donationhistory');
            table.text('totaldonations');
            table.integer('originalrowid');
        })
        .createTable('normalization_audit', function (table) {
            table.increments('auditid').primary();
            table.integer('rowid').notNullable();
            table.text('reason').notNullable();
            table.text('participantemail');
            table.text('participantfirstname');
            table.text('participantlastname');
            table.text('participantdob');
            table.text('participantrole');
            table.text('participantphone');
            table.text('participantcity');
            table.text('participantstate');
            table.text('participantzip');
            table.text('participantschooloremployer');
            table.text('participantfieldofinterest');
            table.timestamp('logged_at').notNullable().defaultTo(knex.fn.now());
        });
};

exports.down = function (knex) {
    // Drop tables in REVERSE order to avoid foreign key constraints errors
    return knex.schema
        .dropTableIfExists('normalization_audit')
        .dropTableIfExists('stagingarchive')
        .dropTableIfExists('stagingrawsurvey')
        .dropTableIfExists('surveyinstances')
        .dropTableIfExists('participantattendanceinstances')
        .dropTableIfExists('eventinstances')
        .dropTableIfExists('participantmilestones')
        .dropTableIfExists('participantdonations')
        .dropTableIfExists('eventtypes')
        .dropTableIfExists('participantinfo');
};