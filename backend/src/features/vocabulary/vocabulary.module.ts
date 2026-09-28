import { Module } from '@nestjs/common';
import { VocabularyFoldersController } from './controllers/vocabulary-folders.controller';
import { VocabularyEntriesController } from './controllers/vocabulary-entries.controller';
import { UserNotebookController } from './controllers/user-notebook.controller';
import { DictationController } from './controllers/dictation.controller';

import { VocabularyFoldersService } from './services/vocabulary-folders.service';
import { VocabularyEntriesService } from './services/vocabulary-entries.service';
import { UserNotebookService } from './services/user-notebook.service';
import { DictationService } from './services/dictation.service';

import { VocabularyFoldersRepository } from './repositories/vocabulary-folders.repository';
import { VocabularyEntriesRepository } from './repositories/vocabulary-entries.repository';
import { UserNotebookRepository } from './repositories/user-notebook.repository';
import { DictationRepository } from './repositories/dictation.repository';

@Module({
  controllers: [
    VocabularyFoldersController,
    VocabularyEntriesController,
    UserNotebookController,
    DictationController,
  ],
  providers: [
    VocabularyFoldersService,
    VocabularyEntriesService,
    UserNotebookService,
    DictationService,
    VocabularyFoldersRepository,
    VocabularyEntriesRepository,
    UserNotebookRepository,
    DictationRepository,
  ],
  exports: [
    VocabularyFoldersService,
    VocabularyEntriesService,
    UserNotebookService,
    DictationService,
  ],
})
export class VocabularyModule {}
